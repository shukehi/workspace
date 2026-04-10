import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCylinderAccessoryPackData } from '../src/lib/erp-engine/dataExtractors';

test('extractCylinderAccessoryPackData creates accessory pack rows from fshz and mshd', () => {
  const rows = [{
    fshz: '一号铝小面板',
    mshd: '7',
    qty: '2/3',
  }];

  const mapping = {
    secondaryAccessoryPackRules: [
      {
        conditionField: 'fshz',
        keyword: '一号铝小面板',
        supplier: '配件供应商',
        itemName: '副锁护罩',
        unit: '套',
        remark: '副锁护罩配件包',
        thicknessAccessoryPacks: {
          '5': '5公分配件包',
          '7': '7公分配件包',
          '9': '9公分配件包',
          '10': '10公分配件包',
        },
        thicknessMaterialCodes: {
          '5': 'ACC-PACK-5',
          '7': 'ACC-PACK-7',
          '9': 'ACC-PACK-9',
          '10': 'ACC-PACK-10',
        },
      },
    ],
  };

  const extracted = extractCylinderAccessoryPackData(rows as any[], mapping);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].supplier, '配件供应商');
  assert.equal(extracted[0].materialId, 'ACC-PACK-7');
  assert.equal(extracted[0].type, '副锁护罩');
  assert.equal(extracted[0].spec, '7公分配件包');
  assert.equal(extracted[0].unit, '套');
  assert.equal(extracted[0].remark, '副锁护罩配件包');
  assert.equal(extracted[0].quantity, 5);
});

test('extractCylinderAccessoryPackData skips unmatched thickness pack', () => {
  const rows = [{
    fshz: '一号铝小面板',
    mshd: '8',
    qty: '1/1',
  }];

  const mapping = {
    secondaryAccessoryPackRules: [
      {
        conditionField: 'fshz',
        keyword: '一号铝小面板',
        supplier: '配件供应商',
        thicknessAccessoryPacks: {
          '7': '7公分配件包',
        },
        thicknessMaterialCodes: {
          '7': 'ACC-PACK-7',
        },
      },
    ],
  };

  const extracted = extractCylinderAccessoryPackData(rows as any[], mapping);
  assert.deepEqual(extracted, []);
});

test('extractCylinderAccessoryPackData honors configured conditionField', () => {
  const rows = [{
    sxhz: '一号铝小面板',
    fshz: '无',
    mshd: '7',
    qty: '1/2',
  }];

  const mapping = {
    secondaryAccessoryPackRules: [
      {
        conditionField: 'sxhz',
        keyword: '一号铝小面板',
        supplier: '配件供应商',
        itemName: '主锁护罩',
        thicknessAccessoryPacks: {
          '7': '7公分配件包',
        },
        thicknessMaterialCodes: {
          '7': 'ACC-MAIN-PACK-7',
        },
      },
    ],
  };

  const extracted = extractCylinderAccessoryPackData(rows as any[], mapping);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].materialId, 'ACC-MAIN-PACK-7');
  assert.equal(extracted[0].type, '主锁护罩');
  assert.equal(extracted[0].quantity, 3);
});
