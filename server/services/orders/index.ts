import orderService from './order.service';

/**
 * 订单领域服务统一导出
 */
export {
    orderService,
};

// 兼容现有 CommonJS 引用
export default orderService;

// CJS interop: ensure require() returns the service directly
module.exports = orderService;
