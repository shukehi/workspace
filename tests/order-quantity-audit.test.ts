import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateAuditItems,
  diffAuditItems,
  normalizeAuditCategory,
  scoreAuditMismatch,
  supportsSplitQuantityAudit,
} from '../server/services/orders/order-quantity-audit';

test('order quantity audit normalizes categories and split support', () => {
  assert.equal(normalizeAuditCategory('包装'), 'packaging');
  assert.equal(normalizeAuditCategory('拉手'), 'handle');
  assert.equal(normalizeAuditCategory('锁具'), 'lockset');
  assert.equal(normalizeAuditCategory('五金/配件'), 'hardware');
  assert.equal(supportsSplitQuantityAudit('包装'), true);
  assert.equal(supportsSplitQuantityAudit('锁芯'), false);
});

test('order quantity audit aggregates duplicate signatures', () => {
  const aggregated = aggregateAuditItems('包装', [
    { internal_name: '包装A', spec: '900*2100', mb: '门边A', quantity: 5, quantity_left: 2, quantity_right: 3 },
    { internal_name: '包装A', spec: '900*2100', mb: '门边A', quantity: 7, quantity_left: 4, quantity_right: 3 },
  ] as any[]);

  assert.equal(aggregated.length, 1);
  assert.equal(aggregated[0].quantity, 12);
  assert.equal(aggregated[0].quantityLeft, 6);
  assert.equal(aggregated[0].quantityRight, 6);
});

test('order quantity audit detects packaging total mismatch even when left/right match', () => {
  const lines = diffAuditItems(
    '包装',
    [{ internal_name: '包装A', spec: '900*2100', mb: '门边A', quantity: 10, quantity_left: 10, quantity_right: 10 }] as any[],
    [{ internal_name: '包装A', spec: '900*2100', mb: '门边A', quantity: 20, quantity_left: 10, quantity_right: 10 }] as any[],
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].actualQuantity, 10);
  assert.equal(lines[0].expectedQuantity, 20);
  assert.equal(lines[0].actualQuantityLeft, 10);
  assert.equal(lines[0].expectedQuantityLeft, 10);
  assert.equal(scoreAuditMismatch(lines), 10);
});

test('order quantity audit detects split quantity mismatch on accessory orders', () => {
  const lines = diffAuditItems(
    '拉手',
    [{ type: '拉手A', spec: 'H-1', quantity: 5, quantity_left: 2, quantity_right: 3 }] as any[],
    [{ type: '拉手A', spec: 'H-1', quantity: 5, quantity_left: 2, quantity_right: 4 }] as any[],
  );

  assert.equal(lines.length, 1);
  assert.equal(lines[0].actualQuantityRight, 3);
  assert.equal(lines[0].expectedQuantityRight, 4);
});
