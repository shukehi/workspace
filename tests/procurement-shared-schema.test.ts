import test from 'node:test';
import assert from 'node:assert/strict';
import sharedSchema from '../src/features/procurement/procurement-schema.shared.json';
import { CATEGORY_CONFIGS } from '../src/features/procurement/docModel';
import { CATEGORY_SCHEMAS } from '../src/features/procurement/order-sheet.schema';

const categories = ['packaging', 'cylinder', 'handle', 'lock', 'hardware'] as const;

test('shared procurement schema: categories and semantic widths are complete', () => {
  categories.forEach((category) => {
    assert.ok(sharedSchema.categories[category]);
    assert.ok(sharedSchema.categoryBaselineTotalWidth[category] > 0);
    assert.ok(Array.isArray(sharedSchema.categories[category].columns));
    assert.ok(sharedSchema.categories[category].columns.length > 0);
  });

  assert.ok(sharedSchema.semanticWidths.specLike > 0);
  assert.ok(sharedSchema.semanticWidths.remark >= 160);
});

test('shared schema parity: docModel/pdf configs and order sheet schemas stay aligned', () => {
  categories.forEach((category) => {
    const docConfig = CATEGORY_CONFIGS[category];
    const sheetSchema = CATEGORY_SCHEMAS[category];

    assert.deepEqual(docConfig.fields, sheetSchema.columns.map((column) => column.key));
    assert.deepEqual(docConfig.headers, sheetSchema.columns.map((column) => column.label));
  });
});
