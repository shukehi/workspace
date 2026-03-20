import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../app/http/response';
import inventoryLocationService from '../services/inventory/inventory-location.service';

export async function listLocations(_req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryLocationService.list());
}

export async function createLocation(req: Request, res: Response): Promise<void> {
    sendCreated(res, await inventoryLocationService.create(req.body || {}));
}

export async function updateLocation(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryLocationService.update(req.params.id, req.body || {}));
}
