const AppError = require('../app/errors/AppError');
const ERROR_CODES = require('../app/errors/errorCodes');
const { sendSuccess } = require('../app/http/response');
const { inventoryReceiptService } = require('../services/inventory');

function ensureReceiptId(value) {
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

async function listReceipts(req, res) {
    return sendSuccess(res, await inventoryReceiptService.list(req.query || {}));
}

async function getReceipt(req, res) {
    return sendSuccess(res, await inventoryReceiptService.getById(ensureReceiptId(req.params.id)));
}

async function reverseReceipt(req, res) {
    return sendSuccess(
        res,
        await inventoryReceiptService.reverseReceipt(ensureReceiptId(req.params.id), req.body || {})
    );
}

module.exports = {
    listReceipts,
    getReceipt,
    reverseReceipt,
};
