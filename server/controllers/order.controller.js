const AppError = require('../app/errors/AppError');
const ERROR_CODES = require('../app/errors/errorCodes');
const { sendSuccess } = require('../app/http/response');
const orderService = require('../services/orders');

function ensureOrderId(value) {
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

async function listOrders(req, res) {
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
        return sendSuccess(res, await orderService.getPaginatedOrders(req.query || {}));
    }

    return sendSuccess(res, await orderService.getAllOrders(req.query.category));
}

async function getOrder(req, res) {
    const order = await orderService.getOrderById(ensureOrderId(req.params.id));
    if (!order) {
        throw new AppError({
            code: ERROR_CODES.NOT_FOUND,
            status: 404,
            details: { message: 'Not found' },
        });
    }

    return sendSuccess(res, order);
}

async function createOrder(req, res) {
    return sendSuccess(res, await orderService.createOrder(req.body || {}));
}

async function updateOrder(req, res) {
    return sendSuccess(
        res,
        await orderService.updateOrder(ensureOrderId(req.params.id), req.body || {})
    );
}

async function updateOrderStatus(req, res) {
    const id = ensureOrderId(req.params.id);
    const { status } = req.body || {};
    return sendSuccess(
        res,
        await orderService.updateOrder(id, { status })
    );
}

async function arriveOrder(req, res) {
    return sendSuccess(
        res,
        await orderService.markArrived(ensureOrderId(req.params.id), req.body || {})
    );
}

async function stockInOrder(req, res) {
    return sendSuccess(
        res,
        await orderService.stockInOrder(ensureOrderId(req.params.id), req.body || {})
    );
}

async function deleteOrder(req, res) {
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

    return sendSuccess(res, { success: true, data: { deleted } });
}

module.exports = {
    listOrders,
    getOrder,
    createOrder,
    updateOrder,
    updateOrderStatus,
    arriveOrder,
    stockInOrder,
    deleteOrder,
};
