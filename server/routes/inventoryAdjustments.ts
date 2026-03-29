import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryAdjustmentController from '../controllers/inventory-adjustment.controller';
import { validateInventoryAdjustmentCreateBody } from '../validators/inventory-adjustment.validators';

const router: Router = Router();

router.post(
    '/',
    validateRequest({
        body: validateInventoryAdjustmentCreateBody,
    }),
    asyncHandler(inventoryAdjustmentController.createInventoryAdjustment)
);

router.use(errorHandler);

export default router;
