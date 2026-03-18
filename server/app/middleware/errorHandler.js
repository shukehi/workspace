const config = require('../../config');
const { createApiErrorResponse } = require('../../shared/contracts/api');
const ERROR_CODES = require('../errors/errorCodes');
const normalizeError = require('../errors/normalizeError');
const { logger } = require('../logger');

function errorHandler(err, req, res, next) {
    const normalized = normalizeError(err);
    const original = normalized.originalError || err;

    if (normalized.status >= 500) {
        logger.error({ err: original, method: req.method, url: req.url }, '服务器错误');
    }

    if (normalized.code === ERROR_CODES.INTERNAL_ERROR) {
        return res.status(normalized.status).json({
            error: normalized.message || ERROR_CODES.INTERNAL_ERROR,
            ...(config.server.env === 'development' ? { code: normalized.code } : {}),
        });
    }

    return res.status(normalized.status).json(
        createApiErrorResponse(normalized.code, normalized.details || {})
    );
}

module.exports = errorHandler;
