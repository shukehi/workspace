import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocalFormulaKey,
  isMeaningfulBomRow,
  normalizeBomRow,
  normalizeServerErrors,
  validateFormulaDraft,
  LOCAL_DRAFT_KEY_PREFIX,
} from '../src/features/formulas/model/formulaDraft';

test('formula draft model: normalizeBomRow strips supplier prefix from material id', () => {
  const row = normalizeBomRow({
    materialId: '华荣8181',
    supplier: '华荣',
    position: '门框',
    materialCategory: '油漆',
    usage: { single: 1, double: 2, paired: 0 },
  });

  assert.equal(row.materialId, '8181');
  assert.equal(row.position, '门框');
});

test('formula draft model: normalizeServerErrors remaps bom field paths', () => {
  const mapped = normalizeServerErrors([
    { field: 'bom[2].materialId', message: '型号不能为空' },
    { field: 'displayName', message: '配方名称不能为空' },
  ]);

  assert.deepEqual(mapped, {
    'bom.2.materialId': '型号不能为空',
    displayName: '配方名称不能为空',
  });
});

test('formula draft model: validateFormulaDraft reports required and duplicate bom issues', () => {
  const errors = validateFormulaDraft(
    { formulaKey: '', displayName: '' } as any,
    [
      {
        materialId: 'A100',
        position: '门框',
        materialCategory: '油漆',
        supplier: '华荣',
        usage: { single: 1, double: 0, paired: 0 },
      },
      {
        materialId: 'A100',
        position: '门框',
        materialCategory: '',
        supplier: '',
        usage: { single: -1, double: 0, paired: 0 },
      },
    ],
  );

  assert.equal(errors.formulaKey, '配方编码不能为空');
  assert.equal(errors.displayName, '配方名称不能为空');
  assert.equal(errors['bom.1.materialCategory'], '请选择类别');
  assert.equal(errors['bom.1.supplier'], '供应商不能为空');
  assert.equal(errors['bom.1.usage.single'], '用量必须为非负数');
  assert.equal(errors['bom.1.dup'], '存在重复物料+位置');
});

test('formula draft model: local draft and meaningful row helpers remain stable', () => {
  assert.equal(isLocalFormulaKey(`${LOCAL_DRAFT_KEY_PREFIX}123`), true);
  assert.equal(isMeaningfulBomRow(normalizeBomRow()), false);
  assert.equal(isMeaningfulBomRow(normalizeBomRow({ supplier: '华荣' })), true);
});
