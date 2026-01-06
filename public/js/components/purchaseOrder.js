/**
 * Purchase Order Management Module
 * Handles PO generation, storage, and retrieval
 */

// ==================== Constants ====================

const PO_STORAGE_KEY = 'purchase_orders';
const PO_COUNTER_KEY = 'po_counter';

// ==================== PO Number Generation ====================

/**
 * Generate unique PO number in format: PO-YYYYMMDD-NNN
 * @returns {string} PO number
 */
function generatePONumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

    // Get today's counter
    const counterData = JSON.parse(localStorage.getItem(PO_COUNTER_KEY) || '{}');
    const currentDate = counterData.date || '';
    let counter = currentDate === dateStr ? (counterData.count || 0) : 0;

    // Increment counter
    counter++;

    // Save updated counter
    localStorage.setItem(PO_COUNTER_KEY, JSON.stringify({
        date: dateStr,
        count: counter
    }));

    // Format: PO-20251231-001
    const paddedCounter = String(counter).padStart(3, '0');
    return `PO-${dateStr}-${paddedCounter}`;
}

// ==================== PO Data Management ====================

/**
 * Create purchase order snapshot
 * @param {Object} orderData - Original order data
 * @param {Array|Object} itemsData - Aggregated data (packaging/cylinder/hardware/lock)
 * @param {Array} mergeFlags - Merge checkbox states
 * @param {string} category - PO category (packaging/cylinder/hardware/lock)
 * @returns {Object} PO record
 */
export function generatePurchaseOrder(orderData, itemsData, mergeFlags = [], category = 'packaging') {
    const poNumber = generatePONumber();
    const timestamp = new Date().toISOString();

    // Create deep copy to avoid mutations
    // 根据类别决定使用哪个数据源
    let items;
    if (category === 'packaging') {
        // 包装类别：使用原始订单数据（因为需要规格、门板等原始字段）
        items = orderData.list ? orderData.list.map((item, idx) => ({
            ...item,
            _allowMerge: mergeFlags[idx] || false
        })) : [];
    } else {
        // 其他类别（锁芯、五金、边锁）：使用提取后的数据
        // itemsData 是已经聚合和转换后的数据（如锁芯的 type, supplier, eccentricity 等）
        items = Array.isArray(itemsData) ? itemsData : [];
    }

    const snapshot = {
        poNumber,
        category, // 新增：类别标识
        createdAt: timestamp,
        status: 'generated', // generated, printed, exported

        // Order information
        order: {
            code: orderData.code,
            customerName: orderData.customerName,
            orderDate: orderData.orderDate,
            advanceDate: orderData.advanceDate,
            remark: orderData.remark
        },

        // Item details
        items: items,

        // Category-specific data (保留原始提取数据，用于调试和引用)
        data: itemsData,

        // Metadata
        metadata: {
            generatedBy: 'system', // Could be username in future
            version: '1.0'
        }
    };

    // Save to localStorage
    savePurchaseOrder(snapshot);

    console.log('✅ Purchase Order Generated:', poNumber, 'Category:', category);
    return snapshot;
}

/**
 * Save PO to localStorage
 * @param {Object} po - Purchase order object
 */
function savePurchaseOrder(po) {
    const allPOs = getAllPurchaseOrders();
    allPOs[po.poNumber] = po;
    localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(allPOs));
}

/**
 * Get all purchase orders from localStorage
 * @returns {Object} Map of PO number to PO object
 */
function getAllPurchaseOrders() {
    const data = localStorage.getItem(PO_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

/**
 * Get specific purchase order
 * @param {string} poNumber - PO number
 * @returns {Object|null} PO object or null if not found
 */
export function getPurchaseOrder(poNumber) {
    const allPOs = getAllPurchaseOrders();
    return allPOs[poNumber] || null;
}

/**
 * List all purchase orders (sorted by creation date, newest first)
 * @returns {Array} Array of PO objects
 */
export function listPurchaseOrders() {
    const allPOs = getAllPurchaseOrders();
    return Object.values(allPOs).sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    );
}

/**
 * Update PO status
 * @param {string} poNumber - PO number
 * @param {string} status - New status
 */
export function updatePOStatus(poNumber, status) {
    const po = getPurchaseOrder(poNumber);
    if (po) {
        po.status = status;
        po.lastModified = new Date().toISOString();
        savePurchaseOrder(po);
        console.log(`📝 PO ${poNumber} status updated to: ${status}`);
    }
}

/**
 * Delete purchase order
 * @param {string} poNumber - PO number
 * @returns {boolean} Success status
 */
export function deletePurchaseOrder(poNumber) {
    const allPOs = getAllPurchaseOrders();
    if (allPOs[poNumber]) {
        delete allPOs[poNumber];
        localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(allPOs));
        console.log(`🗑️ PO ${poNumber} deleted`);
        return true;
    }
    return false;
}

// ==================== Utility Functions ====================

/**
 * Export all POs as JSON (for backup)
 * @returns {string} JSON string
 */
export function exportAllPOs() {
    return JSON.stringify(getAllPurchaseOrders(), null, 2);
}

/**
 * Import POs from JSON (for restore)
 * @param {string} jsonData - JSON string
 * @returns {boolean} Success status
 */
export function importPOs(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        localStorage.setItem(PO_STORAGE_KEY, JSON.stringify(data));
        console.log('✅ POs imported successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to import POs:', error);
        return false;
    }
}

/**
 * Clear all purchase orders (use with caution)
 */
export function clearAllPOs() {
    localStorage.removeItem(PO_STORAGE_KEY);
    localStorage.removeItem(PO_COUNTER_KEY);
    console.log('🗑️ All POs cleared');
}
