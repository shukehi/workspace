import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryMovementController from '../controllers/inventory-movement.controller';
import { validateInventoryMovementListQuery } from '../validators/inventory-movement.validators';

const router: Router = Router();

router.get(
    '/',
    validateRequest({ query: validateInventoryMovementListQuery }),
    asyncHandler(inventoryMovementController.listInventoryMovements),
);

router.use(errorHandler);

export default router;
