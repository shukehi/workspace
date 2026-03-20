import { Request, Response } from 'express';
import { sendSuccess } from '../app/http/response';
import { inventoryService } from '../services/inventory';

export async function listInventory(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryService.listInventory(_req.query as Record<string, unknown>));
}

export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
    sendSuccess(
        res,
        await inventoryService.updateInventoryItem(req.params.id, req.body),
    );
}
