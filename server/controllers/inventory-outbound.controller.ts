import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../app/http/response';
import inventoryOutboundService from '../services/inventory/inventory-outbound.service';

export async function listOutbounds(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryOutboundService.list(req.query));
}

export async function getOutbound(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryOutboundService.getById(req.params.id));
}

export async function createOutbound(req: Request, res: Response): Promise<void> {
    sendCreated(res, await inventoryOutboundService.create(req.body || {}));
}

export async function reverseOutbound(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryOutboundService.reverse(req.params.id, req.body || {}));
}
