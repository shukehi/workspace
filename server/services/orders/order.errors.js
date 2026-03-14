const { API_ERROR_CODES } = require('../../shared/contracts/api');
const {
    InvalidStatusTransitionError,
    OrderEditLockedError,
} = require('./order.policy');

class DuplicateOrderError extends Error {
    constructor(existingOrder) {
        super(API_ERROR_CODES.DUPLICATE_ORDER);
        this.name = 'DuplicateOrderError';
        this.code = API_ERROR_CODES.DUPLICATE_ORDER;
        this.existingOrder = existingOrder;
    }
}

class MissingMaterialError extends Error {
    constructor(materialId) {
        super(API_ERROR_CODES.MATERIAL_NOT_FOUND);
        this.name = 'MissingMaterialError';
        this.code = API_ERROR_CODES.MATERIAL_NOT_FOUND;
        this.materialId = materialId;
    }
}

class ReceivedQuantityExceededError extends Error {
    constructor(orderItemId, orderedQuantity, nextReceivedQuantity) {
        super(API_ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED);
        this.name = 'ReceivedQuantityExceededError';
        this.code = API_ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED;
        this.orderItemId = orderItemId;
        this.orderedQuantity = orderedQuantity;
        this.nextReceivedQuantity = nextReceivedQuantity;
    }
}

module.exports = {
    DuplicateOrderError,
    InvalidStatusTransitionError,
    MissingMaterialError,
    OrderEditLockedError,
    ReceivedQuantityExceededError,
};
