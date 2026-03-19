import type { Request, Response, NextFunction } from 'express';
import { createApiErrorResponse } from '../../shared/contracts/api';
import ERROR_CODES from '../errors/errorCodes';

function notFound(req: Request, res: Response, _next: NextFunction): void {
    res.status(404).json(createApiErrorResponse(ERROR_CODES.NOT_FOUND, {
        message: 'Not found',
        path: req.originalUrl || req.url,
    }));
}

export default notFound;
