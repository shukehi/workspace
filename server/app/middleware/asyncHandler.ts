import type { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function asyncHandler(handler: AsyncRouteHandler): (req: Request, res: Response, next: NextFunction) => void {
    return async function wrappedHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}

export default asyncHandler;
