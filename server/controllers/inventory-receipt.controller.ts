import { Request, Response } from 'express';
import AppError from '../app/errors/AppError';
import ERROR_CODES from '../app/errors/errorCodes';
import { sendSuccess } from '../app/http/response';
import { inventoryReceiptService } from '../services/inventory';

function ensureReceiptId(value: unknown): string {
    const raw = String(value || '').trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        throw new AppError({
            code: ERROR_CODES.VALIDATION_ERROR,
            status: 400,
            details: {
                issues: [{ target: 'params', field: 'id', message: 'Receipt id must be a positive integer' }],
            },
        });
    }
    return String(numeric);
}

export async function listReceipts(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryReceiptService.list(req.query as any || {}));
}

export async function getReceipt(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await inventoryReceiptService.getById(ensureReceiptId(req.params.id)));
}

export async function reverseReceipt(req: Request, res: Response): Promise<void> {
    sendSuccess(
        res,
        await inventoryReceiptService.reverseReceipt(ensureReceiptId(req.params.id), req.body || {})
    );
}

