import { Request, Response } from 'express';
import { sendSuccess } from '../app/http/response';
import inventoryMovementQueryService from '../services/inventory/inventory-movement-query.service';

export async function listInventoryMovements(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryMovementQueryService.list(req.query as Record<string, unknown>));
}
