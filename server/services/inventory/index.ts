import inventoryService from './inventory.service';
import inventoryAdjustmentService from './inventory-adjustment.service';
import { applyInventoryMovement } from './inventory-movement.service';
import inventoryReceiptService from './inventory-receipt.service';
import inventoryLocationService from './inventory-location.service';
import inventoryOutboundService from './inventory-outbound.service';

/**
 * 库存领域服务统一导出
 */
export {
    inventoryService,
    inventoryAdjustmentService,
    applyInventoryMovement,
    inventoryReceiptService,
    inventoryLocationService,
    inventoryOutboundService,
};
