import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryController from '../controllers/inventory.controller';
import {
    validateInventoryIdParams,
    validateInventoryUpdateBody,
} from '../validators/inventory.validators';

const router: Router = Router();

// GET /api/inventory
router.get('/', asyncHandler(inventoryController.listInventory));

// PUT /api/inventory/:id
router.put(
    '/:id',
    validateRequest({
        params: validateInventoryIdParams,
        body: validateInventoryUpdateBody,
    }),
    asyncHandler(inventoryController.updateInventoryItem)
);

router.use(errorHandler);

export default router;
