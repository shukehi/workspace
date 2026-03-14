import { errorResolverRegistry } from './errorResolverRegistry';
import { orderErrorResolver } from '../../services/orders/order.errors';
import { inventoryErrorResolver } from '../../services/inventory/inventory-receipt.errors';

/**
 * 初始化后端错误处理系统
 * 注册各领域的错误解析策略
 */
export function initErrorSystem() {
    // 注册顺序决定了匹配优先级
    errorResolverRegistry.register(orderErrorResolver);
    errorResolverRegistry.register(inventoryErrorResolver);
    
    console.log('[ErrorSystem] Registered domain error resolvers: Orders, Inventory');
}

// 兼容 CommonJS
module.exports = { initErrorSystem };
