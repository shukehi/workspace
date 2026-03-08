import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHandleData } from '../src/lib/erp-engine/dataExtractors';

test('extractHandleData maps matched handle by activity/thickness', () => {
  const rows = [{
    ls: 'DJ-6847双活不分左右',
    xsbz: '常规双活',
    remark: '',
    mshd: '10',
    qty: '2/3',
  }];

  const mapping = {
    defaultSupplier: '拉手供应商A',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手(待人工处理)',
    singleKeywords: ['单活'],
    doubleKeywords: ['双活'],
    thicknessAccessoryPacks: {
      '5': '5公分配件包',
      '7': '7公分配件包',
      '9': '9公分配件包',
      '10': '10公分配件包',
    },
    mappings: {
      'DJ-6847双活不分左右': {
        supplier: '供应商X',
        vendorNameSingle: 'DJ-6847单活供应商名',
        vendorNameDouble: 'DJ-6847双活供应商名',
      },
    },
  };

  const extracted = extractHandleData(rows as any[], { remark: '' }, mapping);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].supplier, '供应商X');
  assert.equal(extracted[0].type, 'DJ-6847双活供应商名');
  assert.equal(extracted[0].spec, '10公分配件包');
  assert.equal(extracted[0].quantity, 5);
});

test('extractHandleData creates unmatched item for unknown mshd or mapping', () => {
  const rows = [{
    ls: '未知拉手A',
    xsbz: '单活',
    remark: '',
    mshd: '8',
    qty: '1/1',
  }];

  const mapping = {
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手(待人工处理)',
    singleKeywords: ['单活'],
    doubleKeywords: ['双活'],
    thicknessAccessoryPacks: {
      '5': '5公分配件包',
      '7': '7公分配件包',
      '9': '9公分配件包',
      '10': '10公分配件包',
    },
    mappings: {},
  };

  const extracted = extractHandleData(rows as any[], { remark: '' }, mapping);
  assert.equal(extracted.length, 1);
  assert.equal(extracted[0].supplier, '待人工处理');
  assert.equal(extracted[0].type, '未匹配拉手(待人工处理)');
  assert.ok(extracted[0].remark.includes('待人工处理'));
});
