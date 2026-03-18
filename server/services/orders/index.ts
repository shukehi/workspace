import orderService from './order.service';

/**
 * 订单领域服务统一导出
 */
export {
    orderService,
};

// 兼容现有 CommonJS 引用
module.exports = orderService;
export default orderService;
