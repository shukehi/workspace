import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_PENDING_STATUSES, ORDER_STATUSES } from '../src/shared/constants/order';
import { API_ERROR_CODES } from '../src/shared/constants/api';

const {
  ORDER_STATUSES: SERVER_ORDER_STATUSES,
  ORDER_PENDING_STATUSES: SERVER_ORDER_PENDING_STATUSES,
} = require('../server/shared/constants/order');
const {
  API_ERROR_CODES: SERVER_API_ERROR_CODES,
  createApiErrorResponse,
  createApiSuccessResponse,
} = require('../server/shared/contracts/api');

test('shared contracts: frontend and backend order status lists stay aligned', () => {
  assert.deepEqual(ORDER_STATUSES, SERVER_ORDER_STATUSES);
  assert.deepEqual(ORDER_PENDING_STATUSES, SERVER_ORDER_PENDING_STATUSES);
});

test('shared contracts: frontend and backend error codes stay aligned for core order cases', () => {
  assert.equal(API_ERROR_CODES.duplicateOrder, SERVER_API_ERROR_CODES.DUPLICATE_ORDER);
  assert.equal(API_ERROR_CODES.invalidStatusTransition, SERVER_API_ERROR_CODES.INVALID_STATUS_TRANSITION);
  assert.equal(API_ERROR_CODES.orderEditLocked, SERVER_API_ERROR_CODES.ORDER_EDIT_LOCKED);
  assert.equal(API_ERROR_CODES.materialNotFound, SERVER_API_ERROR_CODES.MATERIAL_NOT_FOUND);
  assert.equal(API_ERROR_CODES.receivedQuantityExceeded, SERVER_API_ERROR_CODES.RECEIVED_QUANTITY_EXCEEDED);
  assert.equal(API_ERROR_CODES.orderItemsRequired, SERVER_API_ERROR_CODES.ORDER_ITEMS_REQUIRED);
});

test('shared contracts: API response helpers produce the expected envelope shape', () => {
  assert.deepEqual(createApiSuccessResponse({ id: 1 }, 'ok'), {
    success: true,
    data: { id: 1 },
    message: 'ok',
  });
  assert.deepEqual(createApiErrorResponse(SERVER_API_ERROR_CODES.INVALID_ID, { message: 'bad id' }), {
    error: 'INVALID_ID',
    message: 'bad id',
  });
});
