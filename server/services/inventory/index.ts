import inventoryService from './inventory.service';
import inventoryReceiptService from './inventory-receipt.service';

/**
 * 库存领域服务统一导出
 */
export {
    inventoryService,
    inventoryReceiptService,
};

// 兼容现有 CommonJS 引用
module.exports = {
    inventoryService,
    inventoryReceiptService,
};
