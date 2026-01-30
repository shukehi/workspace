/**
 * OrderPool Class
 * Manages multiple orders with built-in caching and observer pattern
 */

import { calculateColorStatistics } from './statisticsCalculator.js';

/**
 * Statistics Cache
 * Caches calculated statistics to avoid redundant computations
 */
class StatisticsCache {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Generate cache key from orders
     * @param {Array} orders - Array of order objects
     * @returns {string} Cache key
     */
    generateKey(orders) {
        return orders
            .map(o => {
                const excludedCount = (o.list || []).filter(i => i._excludeStats).length;
                return `${o.code}:${o.list?.length || 0}:${excludedCount}`;
            })
            .sort()
            .join('|');
    }

    /**
     * Get cached statistics or calculate new
     * @param {Array} orders - Array of order objects
     * @param {Array} mergedItems - Merged order items
     * @returns {Object} Statistics object
     */
    get(orders, mergedItems) {
        const key = this.generateKey(orders);

        if (!this.cache.has(key)) {
            console.log('📊 Calculating statistics (cache miss)');
            const stats = calculateColorStatistics(mergedItems);
            this.cache.set(key, stats);
        } else {
            console.log('⚡ Using cached statistics');
        }

        return this.cache.get(key);
    }

    /**
     * Invalidate cache
     */
    clear() {
        this.cache.clear();
        console.log('🗑️ Statistics cache cleared');
    }

    /**
     * Get cache size
     * @returns {number} Number of cached entries
     */
    size() {
        return this.cache.size;
    }
}

/**
 * OrderPool Class
 * Manages a pool of orders with efficient operations
 */
class OrderPool {
    constructor() {
        this.orders = new Map(); // Use Map for O(1) lookups
        this.listeners = [];
        this.statsCache = new StatisticsCache();
    }

    /**
     * Add order to pool
     * @param {Object} order - Order object
     * @returns {OrderPool} this for chaining
     * @throws {Error} If order is invalid or duplicate
     */
    add(order) {
        if (!order || !order.code) {
            throw new Error('无效的订单数据');
        }

        if (this.orders.has(order.code)) {
            throw new Error(`订单 ${order.code} 已存在`);
        }

        this.orders.set(order.code, order);
        this.statsCache.clear(); // Invalidate cache
        this.notify('add', order);

        console.log(`✅ 已添加订单: ${order.code}`);
        return this;
    }

    /**
     * Remove order from pool
     * @param {string} orderCode - Order code to remove
     * @returns {boolean} True if removed, false if not found
     */
    remove(orderCode) {
        const deleted = this.orders.delete(orderCode);

        if (deleted) {
            this.statsCache.clear(); // Invalidate cache
            this.notify('remove', orderCode);
            console.log(`🗑️ 已移除订单: ${orderCode}`);
        }

        return deleted;
    }

    /**
     * Clear all orders
     * @returns {OrderPool} this for chaining
     */
    clear() {
        this.orders.clear();
        this.statsCache.clear();
        this.notify('clear');
        console.log('🗑️ 已清空订单池');
        return this;
    }

    /**
     * Check if order exists
     * @param {string} orderCode - Order code
     * @returns {boolean} True if exists
     */
    has(orderCode) {
        return this.orders.has(orderCode);
    }

    /**
     * Get specific order
     * @param {string} orderCode - Order code
     * @returns {Object|undefined} Order object or undefined
     */
    get(orderCode) {
        return this.orders.get(orderCode);
    }

    /**
     * Get all orders as array
     * @returns {Array} Array of order objects
     */
    getAll() {
        return Array.from(this.orders.values());
    }

    /**
     * Get most recent order
     * @returns {Object|null} Most recent order or null
     */
    getCurrent() {
        const orders = this.getAll();
        return orders.length > 0 ? orders[orders.length - 1] : null;
    }

    /**
     * Get merged items from all orders with origin tracking
     * @returns {Array} Merged items array
     */
    getMergedItems() {
        return this.getAll().flatMap(order =>
            (order.list || []).map((item, index) => ({
                ...item,
                _originOrder: order.code,
                _originIndex: index,
                _originCustomer: order.customerName
            }))
        );
    }

    /**
     * Get statistics (with caching)
     * @returns {Object} Statistics object
     */
    getStatistics() {
        const orders = this.getAll();
        const mergedItems = this.getMergedItems();
        return this.statsCache.get(orders, mergedItems);
    }

    /**
     * Get pool summary
     * @returns {Object} Summary statistics
     */
    getSummary() {
        const orders = this.getAll();
        const customers = [...new Set(orders.map(o => o.customerName).filter(Boolean))];

        return {
            orderCount: orders.length,
            totalItems: orders.reduce((sum, o) => sum + (o.list?.length || 0), 0),
            orderCodes: orders.map(o => o.code),
            customers,
            hasMultipleCustomers: customers.length > 1
        };
    }

    /**
     * Replace pool with single order
     * @param {Object} order - Order object
     * @returns {OrderPool} this for chaining
     */
    replace(order) {
        this.clear();
        if (order) {
            this.add(order);
        }
        return this;
    }

    /**
     * Toggle item statistics exclusion
     * @param {string} orderCode - Order code
     * @param {number} itemIndex - Index of item in order list
     * @returns {OrderPool} this for chaining
     */
    toggleItemStats(orderCode, itemIndex) {
        const order = this.orders.get(orderCode);
        if (order && order.list && order.list[itemIndex]) {
            const item = order.list[itemIndex];
            item._excludeStats = !item._excludeStats;

            this.statsCache.clear(); // Invalidate cache
            this.notify('update', { orderCode, itemIndex }); // Notify listeners
            this.save(); // Persist changes
            console.log(`🔄 Toggled stats for ${orderCode} item ${itemIndex}: ${!item._excludeStats}`);
        }
        return this;
    }

    /**
     * Subscribe to pool changes
     * @param {Function} listener - Listener function (action, data, pool)
     * @returns {Function} Unsubscribe function
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners
     * @param {string} action - Action type (add, remove, clear)
     * @param {*} data - Action data
     */
    notify(action, data) {
        this.listeners.forEach(listener => {
            try {
                listener(action, data, this);
            } catch (error) {
                console.error('OrderPool listener error:', error);
            }
        });
    }

    /**
     * Save pool to localStorage
     * @returns {OrderPool} this for chaining
     */
    save() {
        try {
            localStorage.setItem('orderPool', JSON.stringify(this.getAll()));
            console.log('💾 订单池已保存');
        } catch (error) {
            console.error('保存订单池失败:', error);
        }
        return this;
    }

    /**
     * Load pool from localStorage
     * @returns {OrderPool} this for chaining
     */
    load() {
        try {
            const saved = localStorage.getItem('orderPool');
            if (saved) {
                const orders = JSON.parse(saved);
                orders.forEach(order => {
                    try {
                        this.add(order);
                    } catch (error) {
                        console.warn(`跳过无效订单: ${order?.code}`, error);
                    }
                });
                console.log(`📂 已加载 ${orders.length} 个订单`);
            }
        } catch (error) {
            console.error('加载订单池失败:', error);
        }
        return this;
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache info
     */
    getCacheInfo() {
        return {
            size: this.statsCache.size(),
            enabled: true
        };
    }
}

// Export singleton instance
export const orderPool = new OrderPool();

// Export class for testing
export { OrderPool, StatisticsCache };
