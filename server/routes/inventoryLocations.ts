import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryLocationController from '../controllers/inventory-location.controller';
import {
    validateInventoryLocationCreateBody,
    validateInventoryLocationIdParams,
    validateInventoryLocationUpdateBody,
} from '../validators/inventory-location.validators';

const router: Router = Router();

router.get('/', asyncHandler(inventoryLocationController.listLocations));

router.post(
    '/',
    validateRequest({ body: validateInventoryLocationCreateBody }),
    asyncHandler(inventoryLocationController.createLocation),
);

router.put(
    '/:id',
    validateRequest({
        params: validateInventoryLocationIdParams,
        body: validateInventoryLocationUpdateBody,
    }),
    asyncHandler(inventoryLocationController.updateLocation),
);

router.use(errorHandler);

export default router;
