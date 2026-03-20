import { Router } from 'express';
import asyncHandler from '../app/middleware/asyncHandler';
import errorHandler from '../app/middleware/errorHandler';
import { validateRequest } from '../app/middleware/validateRequest';
import * as inventoryOutboundController from '../controllers/inventory-outbound.controller';
import {
    validateInventoryOutboundCreateBody,
    validateInventoryOutboundIdParams,
    validateInventoryOutboundListQuery,
    validateInventoryOutboundReverseBody,
} from '../validators/inventory-outbound.validators';

const router: Router = Router();

router.get(
    '/',
    validateRequest({ query: validateInventoryOutboundListQuery }),
    asyncHandler(inventoryOutboundController.listOutbounds),
);

router.get(
    '/:id',
    validateRequest({ params: validateInventoryOutboundIdParams }),
    asyncHandler(inventoryOutboundController.getOutbound),
);

router.post(
    '/',
    validateRequest({ body: validateInventoryOutboundCreateBody }),
    asyncHandler(inventoryOutboundController.createOutbound),
);

router.post(
    '/:id/reverse',
    validateRequest({
        params: validateInventoryOutboundIdParams,
        body: validateInventoryOutboundReverseBody,
    }),
    asyncHandler(inventoryOutboundController.reverseOutbound),
);

router.use(errorHandler);

export default router;
