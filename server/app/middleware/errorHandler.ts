import type { Request, Response, NextFunction } from 'express';
import config from '../../config';
import { createApiErrorResponse } from '../../shared/contracts/api';
import type { ApiErrorCode } from '../../shared/contracts/api';
import ERROR_CODES from '../errors/errorCodes';
import { normalizeError } from '../errors/normalizeError';
import { logger } from '../logger';

function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    const normalized = normalizeError(err);
    const original = normalized.originalError || err;

    if (normalized.status >= 500) {
        logger.error({ err: original, method: req.method, url: req.url }, '服务器错误');
    }

    if (normalized.code === ERROR_CODES.INTERNAL_ERROR) {
        res.status(normalized.status).json({
            error: normalized.message || ERROR_CODES.INTERNAL_ERROR,
            ...(config.server.env === 'development' ? { code: normalized.code } : {}),
        });
        return;
    }

    res.status(normalized.status).json(
        createApiErrorResponse(normalized.code as ApiErrorCode, normalized.details || {})
    );
}

export default errorHandler;
