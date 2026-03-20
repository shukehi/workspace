import { Request, Response } from 'express';
import AppError from '../app/errors/AppError';
import ERROR_CODES from '../app/errors/errorCodes';
import { sendSuccess } from '../app/http/response';
import orderService from '../services/orders';
import type { OrderListQuery } from '../models/types';

function ensureOrderId(value: unknown): string {
    const raw = String(value || '').trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        throw new AppError({
            code: ERROR_CODES.INVALID_ID,
            status: 400,
            details: { message: 'Invalid order id' },
        });
    }
    return String(numeric);
}

export async function listOrders(req: Request, res: Response): Promise<void> {
    const hasPaginationQuery = [
        'page',
        'pageSize',
        'status',
        'risk',
        'createdDate',
        'keyword',
        'orderNo'
    ].some((key) => req.query[key] !== undefined);

    if (hasPaginationQuery) {
        sendSuccess(res, await orderService.getPaginatedOrders(req.query as OrderListQuery));
        return;
    }

    sendSuccess(res, await orderService.getAllOrders(req.query['category'] as string | undefined));
}

export async function getOrder(req: Request, res: Response): Promise<void> {
    const order = await orderService.getOrderById(ensureOrderId(req.params.id));
    if (!order) {
        throw new AppError({
            code: ERROR_CODES.NOT_FOUND,
            status: 404,
            details: { message: 'Not found' },
        });
    }

    sendSuccess(res, order);
}

export async function createOrder(req: Request, res: Response): Promise<void> {
    sendSuccess(res, await orderService.createOrder(req.body || {}));
}

export async function updateOrder(req: Request, res: Response): Promise<void> {
    sendSuccess(
        res,
        await orderService.updateOrder(ensureOrderId(req.params.id), req.body || {})
    );
}

export async function updateOrderStatus(req: Request, res: Response): Promise<void> {
    const id = ensureOrderId(req.params.id);
    const { status } = req.body || {};
    sendSuccess(
        res,
        await orderService.updateOrder(id, { status })
    );
}

export async function arriveOrder(req: Request, res: Response): Promise<void> {
    sendSuccess(
        res,
        await orderService.markArrived(ensureOrderId(req.params.id), req.body || {})
    );
}

export async function stockInOrder(req: Request, res: Response): Promise<void> {
    sendSuccess(
        res,
        await orderService.stockInOrder(ensureOrderId(req.params.id), req.body || {})
    );
}

export async function deleteOrder(req: Request, res: Response): Promise<void> {
    const id = ensureOrderId(req.params.id);
    const deleted = await orderService.deleteOrder(id);
    if (!deleted) {
        throw new AppError({
            code: ERROR_CODES.NOT_FOUND,
            status: 404,
            details: {
                message: 'Order not found',
                id,
            },
        });
    }

    sendSuccess(res, { success: true, data: { deleted } });
}

