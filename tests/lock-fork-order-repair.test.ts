import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanRepairArrivedWithoutReceipts,
  isEditableLockForkRepairStatus,
  resolveLockForkRepairPreviewMode,
} from '../server/services/orders/lock-fork-order-repair';

test('lock-fork order repair: editable statuses stay on normal repair path', () => {
  assert.equal(isEditableLockForkRepairStatus('draft'), true);
  assert.equal(isEditableLockForkRepairStatus('submitted'), true);
  assert.equal(isEditableLockForkRepairStatus('processing'), true);
  assert.equal(isEditableLockForkRepairStatus('arrived'), false);
  assert.equal(resolveLockForkRepairPreviewMode({ status: 'processing', allowArrivedWithoutReceipts: false }), 'editable');
});

test('lock-fork order repair: arrived preview stays blocked unless explicit safe flag is enabled', () => {
  assert.equal(resolveLockForkRepairPreviewMode({ status: 'arrived', allowArrivedWithoutReceipts: false }), 'blocked');
  assert.equal(resolveLockForkRepairPreviewMode({ status: 'arrived', allowArrivedWithoutReceipts: true }), 'arrived_without_receipts_if_safe');
});

test('lock-fork order repair: arrived-without-receipts guard allows only no-stockin no-receipt orders', () => {
  assert.equal(assertCanRepairArrivedWithoutReceipts({
    orderNo: 'PO-ARRIVED-SAFE',
    status: 'arrived',
    stockedInAt: null,
    receiptCount: 0,
    allowArrivedWithoutReceipts: true,
  }), true);

  assert.throws(
    () => assertCanRepairArrivedWithoutReceipts({
      orderNo: 'PO-ARRIVED-STOCKED',
      status: 'arrived',
      stockedInAt: '2026-04-01T00:00:00.000Z',
      receiptCount: 0,
      allowArrivedWithoutReceipts: true,
    }),
    /stocked_in_at/,
  );

  assert.throws(
    () => assertCanRepairArrivedWithoutReceipts({
      orderNo: 'PO-ARRIVED-RECEIPTS',
      status: 'arrived',
      stockedInAt: '',
      receiptCount: 2,
      allowArrivedWithoutReceipts: true,
    }),
    /2 inventory receipts/,
  );

  assert.throws(
    () => assertCanRepairArrivedWithoutReceipts({
      orderNo: 'PO-NOT-ARRIVED',
      status: 'completed',
      stockedInAt: '',
      receiptCount: 0,
      allowArrivedWithoutReceipts: true,
    }),
    /not eligible/,
  );
});
