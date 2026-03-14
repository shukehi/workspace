/**
 * 兼容性转发层 (Compatibility Bridge)
 * 允许旧的 require('../services/InventoryReceiptService') 继续工作
 */
import { inventoryReceiptService } from './inventory';
module.exports = inventoryReceiptService;
export default inventoryReceiptService;
