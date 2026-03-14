/**
 * 兼容性转发层 (Compatibility Bridge)
 * 允许旧的 require('../services/OrderService') 继续工作
 */
import orderService from './orders';
module.exports = orderService;
export default orderService;
