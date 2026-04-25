import test from 'node:test';
import assert from 'node:assert/strict';
import { removeOrderItemByKey, reorderOrderItemsByKey } from '../src/features/procurement/orderItemEditor';

const sampleItems = [
  { item_key: 'row-1', type: 'A' },
  { item_key: 'row-2', type: 'B' },
  { item_key: 'row-3', type: 'C' },
  { item_key: 'row-4', type: 'D' },
];

test('order item editor: removes the requested row but preserves the final remaining row', () => {
  assert.deepEqual(
    removeOrderItemByKey(sampleItems, 'row-2').map((item) => item.item_key),
    ['row-1', 'row-3', 'row-4'],
  );

  assert.deepEqual(
    removeOrderItemByKey([{ item_key: 'only-row', type: 'A' }], 'only-row').map((item) => item.item_key),
    ['only-row'],
  );
});

test('order item editor: reorders rows before the target row', () => {
  const reordered = reorderOrderItemsByKey(sampleItems, {
    sourceItemKey: 'row-4',
    targetItemKey: 'row-2',
    placement: 'before',
  });

  assert.deepEqual(
    reordered.map((item) => item.item_key),
    ['row-1', 'row-4', 'row-2', 'row-3'],
  );
});

test('order item editor: reorders rows after the target row', () => {
  const reordered = reorderOrderItemsByKey(sampleItems, {
    sourceItemKey: 'row-1',
    targetItemKey: 'row-3',
    placement: 'after',
  });

  assert.deepEqual(
    reordered.map((item) => item.item_key),
    ['row-2', 'row-3', 'row-1', 'row-4'],
  );
});

test('order item editor: supports single-step moves through adjacent before/after placements', () => {
  const movedUp = reorderOrderItemsByKey(sampleItems, {
    sourceItemKey: 'row-3',
    targetItemKey: 'row-2',
    placement: 'before',
  });
  assert.deepEqual(
    movedUp.map((item) => item.item_key),
    ['row-1', 'row-3', 'row-2', 'row-4'],
  );

  const movedDown = reorderOrderItemsByKey(sampleItems, {
    sourceItemKey: 'row-2',
    targetItemKey: 'row-3',
    placement: 'after',
  });
  assert.deepEqual(
    movedDown.map((item) => item.item_key),
    ['row-1', 'row-3', 'row-2', 'row-4'],
  );
});

test('order item editor: no-ops when keys are missing or identical', () => {
  assert.deepEqual(
    reorderOrderItemsByKey(sampleItems, {
      sourceItemKey: 'row-2',
      targetItemKey: 'row-2',
      placement: 'before',
    }).map((item) => item.item_key),
    ['row-1', 'row-2', 'row-3', 'row-4'],
  );

  assert.deepEqual(
    reorderOrderItemsByKey(sampleItems, {
      sourceItemKey: 'missing',
      targetItemKey: 'row-2',
      placement: 'before',
    }).map((item) => item.item_key),
    ['row-1', 'row-2', 'row-3', 'row-4'],
  );
});
