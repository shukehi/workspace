import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateBaseFields,
  validateBomRows,
} from '../server/services/formulas/formula.validator'

test('validateBaseFields enforces required fields', () => {
  const errors = validateBaseFields({ formulaKey: '', displayName: '' });
  assert.ok(errors.some((item) => item.field === 'formulaKey'));
  assert.ok(errors.some((item) => item.field === 'displayName'));
});

test('validateBomRows enforces row-level constraints', () => {
  const errors = validateBomRows({
    bom: [
      {
        materialId: 'M-404',
        position: 'main',
        materialCategory: '未知',
        supplier: '',
        usage: { single: -1, double: 0, paired: 0 }
      },
      {
        materialId: 'M-404',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 0, double: 0, paired: 0 }
      }
    ],
    allowEmptyBom: false,
    materialCodeSet: new Set(['M-001'])
  });

  assert.ok(errors.some((item) => item.field === 'bom[0].materialCategory'));
  assert.ok(errors.some((item) => item.field === 'bom[0].supplier'));
  assert.ok(errors.some((item) => item.field === 'bom[0].usage.single'));
  assert.ok(errors.some((item) => item.field === 'bom[1]'));
  assert.ok(errors.some((item) => item.message.includes('物料不存在')));
});

test('validateBomRows allows empty BOM when allowEmptyBom=true', () => {
  const errors = validateBomRows({
    bom: [],
    allowEmptyBom: true
  });
  assert.equal(errors.length, 0);
});
