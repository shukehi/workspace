import { Request, Response } from 'express';
import { sendCreated } from '../app/http/response';
import inventoryAdjustmentService from '../services/inventory/inventory-adjustment.service';

export async function createInventoryAdjustment(req: Request, res: Response): Promise<void> {
    sendCreated(res, await inventoryAdjustmentService.create(req.body || {}));
}
