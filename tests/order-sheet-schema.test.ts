import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSheetSchema,
  getDisplayValue,
  resolveOrderItemQuantity,
  syncOrderItemQuantity,
  resolveAggregateQuantityColumnWidth,
  resolveAggregateQuantityDisplayWidth,
  resolveAggregateRemarkColumnWidth
} from '../src/features/procurement/order-sheet.schema';
import { resolveSchemaPrintCategory } from '../src/features/procurement/templateType';
import { resolveSchemaCategory } from '../server/services/orders/order.template';

test('schema: packaging columns keep expected order', () => {
  const schema = getSheetSchema('packaging');
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark']);
  assert.equal(schema.columns.find((c) => c.key === 'spec')?.label, '规格');
});

test('schema: cylinder columns include unit before remark', () => {
  const schema = getSheetSchema('cylinder');
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'type', 'eccentricity', 'quantity', 'unit', 'remark']);
  assert.equal(schema.columns.find((c) => c.key === 'eccentricity')?.label, '规格');
});

test('schema: handle columns include left/right quantity before unit', () => {
  const schema = getSheetSchema('handle');
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'type', 'spec', 'qtyLeft', 'qtyRight', 'unit', 'remark']);
});

test('schema: lockset columns align with single-quantity procurement sheet', () => {
  const schema = getSheetSchema('lockset');
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'type', 'spec', 'qtyLeft', 'qtyRight', 'unit', 'remark']);
});

test('schema: template mapping unifies double-door and general-accessory templates', () => {
  assert.equal(resolveSchemaPrintCategory('double-door-accessory', '拉手'), 'lockset');
  assert.equal(resolveSchemaPrintCategory('general-accessory', '五金/配件'), 'lock');

  const generalAccessorySchema = getSheetSchema(resolveSchemaPrintCategory('general-accessory', '五金/配件'));
  assert.deepEqual(generalAccessorySchema.columns.map((c) => c.key), ['no', 'type', 'spec', 'quantity', 'unit', 'remark']);
});

test('schema: frontend and backend share the same fallback category for uncategorized orders', () => {
  assert.equal(resolveSchemaPrintCategory(undefined, undefined), 'packaging');
  assert.equal(resolveSchemaCategory(undefined, undefined), 'packaging');
});

test('schema: all spec-like fields use 规格 label across categories', () => {
  const categories = ['packaging', 'cylinder', 'handle', 'lockset', 'lock', 'hardware'] as const;
  categories.forEach((category) => {
    const schema = getSheetSchema(category);
    schema.columns
      .filter((column) => column.semantic === 'specLike')
      .forEach((column) => {
        assert.equal(column.label, '规格');
      });
  });
});

test('display value: spec/mb fallback works for preview consistency', () => {
  const item = {
    model: 'M-100',
    orientation: '左',
    spec: '',
    mb: ''
  };
  assert.equal(getDisplayValue(item as any, 'spec', 0), 'M-100');
  assert.equal(getDisplayValue(item as any, 'mb', 0), '左');
});

test('schema: aggregate quantity view replaces left/right columns with total quantity', () => {
  const schema = getSheetSchema('packaging', { aggregateSideQuantities: true });
  assert.deepEqual(schema.columns.map((c) => c.key), ['no', 'productModelName', 'spec', 'mb', 'quantity', 'remark']);
  assert.equal(schema.columns.find((c) => c.key === 'quantity')?.label, '总数量');
});

test('quantity helpers: split quantity categories sum left and right values', () => {
  const item = { quantity_left: 3, quantity_right: 4, quantity: 0 } as any;
  assert.equal(resolveOrderItemQuantity(item, 'handle'), 7);

  syncOrderItemQuantity(item, 'handle');
  assert.equal(item.quantity, 7);
});

test('quantity helpers: aggregate quantity width is derived from left and right columns', () => {
  assert.equal(
    resolveAggregateQuantityColumnWidth({ qtyLeft: 90, qtyRight: 110 }, { qtyLeft: 72, qtyRight: 72 }),
    200
  );
});

test('quantity helpers: aggregate quantity view keeps total column narrow and moves extra width to remark', () => {
  assert.equal(
    resolveAggregateQuantityDisplayWidth({ qtyLeft: 90, qtyRight: 110 }, { qtyLeft: 72, qtyRight: 72, remark: 160 }),
    72
  );
  assert.equal(
    resolveAggregateRemarkColumnWidth({ qtyLeft: 90, qtyRight: 110, remark: 160 }, { qtyLeft: 72, qtyRight: 72, remark: 160 }),
    288
  );
});
