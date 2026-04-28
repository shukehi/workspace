import test from 'node:test'
import assert from 'node:assert/strict'

import {
  VALID_BOM_CATEGORIES,
  validateBaseFields,
  validateBomRows,
} from '../server/services/formulas/formula.validator'
import { BOM_MATERIAL_CATEGORIES } from '../src/features/formulas/types'
import {
  FORMULA_BOM_MATERIAL_CATEGORIES,
  FORMULA_BOM_MATERIAL_CATEGORY_LABEL,
} from '../src/shared/types/formulaBom'

test('formula BOM categories use the shared frontend/backend contract', () => {
  assert.deepEqual([...VALID_BOM_CATEGORIES], [...FORMULA_BOM_MATERIAL_CATEGORIES]);
  assert.equal(BOM_MATERIAL_CATEGORIES, FORMULA_BOM_MATERIAL_CATEGORIES);
});

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
  assert.ok(errors.some((item) => item.message.includes(FORMULA_BOM_MATERIAL_CATEGORY_LABEL)));
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
