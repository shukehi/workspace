import { errorResolverRegistry } from './errorResolverRegistry';

/**
 * 初始化后端错误处理系统
 * 注册各领域的错误解析策略
 * 使用动态 require 彻底断开与业务 Service 的顶层循环依赖链
 */
export function initErrorSystem() {
    try {
        // 订单领域
        const { orderErrorResolver } = require('../../services/orders/order.errors');
        if (orderErrorResolver) errorResolverRegistry.register(orderErrorResolver);

        // 库存领域
        const { inventoryErrorResolver } = require('../../services/inventory/inventory-receipt.errors');
        if (inventoryErrorResolver) errorResolverRegistry.register(inventoryErrorResolver);
        
        // 仅在非生产环境下静默确认
        if (process.env.NODE_ENV !== 'production' && process.env.DEBUG === '1') {
            console.log('[ErrorSystem] Domain error resolvers registered.');
        }
    } catch (e) {
        console.error('[ErrorSystem] Critical: Failed to register domain resolvers:', e);
    }
}

// 兼容 CommonJS
