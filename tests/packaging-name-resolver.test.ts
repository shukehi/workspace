import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePackagingHeaderNames } from '../src/features/procurement/packagingNameResolver';

const mapping = {
  supplierName: '方亮包装',
  mappings: {
    '3层黄卡美+C单瓦纸箱': '美+C单瓦',
    '美+C五层': '美+C五层',
  },
};

test('resolvePackagingHeaderNames: use item internal_name and mapping value', () => {
  const result = resolvePackagingHeaderNames({
    category: '包装',
    metadata: {},
    items: [{
      id: 1,
      material_id: 'm1',
      internal_name: '3层黄卡美+C单瓦纸箱',
      name: 'x',
      model: 'x',
      quantity: 1,
      unit: '套',
    }],
  } as any, mapping, {
    match: (name: string) => `${name}(未匹配)`,
  });

  assert.equal(result.internalName, '3层黄卡美+C单瓦纸箱');
  assert.equal(result.externalName, '美+C单瓦');
});

test('resolvePackagingHeaderNames: empty internal falls back to 未匹配', () => {
  const result = resolvePackagingHeaderNames({
    category: '包装',
    metadata: {},
    items: [{
      id: 1,
      material_id: 'm1',
      name: 'x',
      model: 'x',
      quantity: 1,
      unit: '套',
    }],
  } as any, mapping, {
    match: () => 'should-not-happen',
  });

  assert.equal(result.internalName, '未匹配');
  assert.equal(result.externalName, '未匹配');
});

test('resolvePackagingHeaderNames: multi internal names -> 多规格包装', () => {
  const result = resolvePackagingHeaderNames({
    category: '包装',
    metadata: {},
    items: [
      { id: 1, material_id: 'm1', internal_name: 'A', name: 'x', model: 'x', quantity: 1, unit: '套' },
      { id: 2, material_id: 'm2', internal_name: 'B', name: 'y', model: 'y', quantity: 1, unit: '套' },
    ],
  } as any, mapping, {
    match: (name: string) => `${name}(未匹配)`,
  });

  assert.equal(result.internalName, '多规格包装');
  assert.equal(result.externalName, '多规格包装');
});

test('resolvePackagingHeaderNames: item-derived names override stale metadata values', () => {
  const result = resolvePackagingHeaderNames({
    category: '包装',
    metadata: {
      internal_name: '-',
      external_name: '1050*2100/7/内开外包 (未匹配)',
    },
    items: [{
      id: 1,
      material_id: 'm1',
      internal_name: '3层黄卡美+C单瓦纸箱',
      name: 'x',
      model: 'x',
      quantity: 1,
      unit: '套',
    }],
  } as any, mapping, {
    match: (name: string) => `${name}(未匹配)`,
  });

  assert.equal(result.internalName, '3层黄卡美+C单瓦纸箱');
  assert.equal(result.externalName, '美+C单瓦');
});

test('resolvePackagingHeaderNames: keep metadata fallback when no item candidates', () => {
  const result = resolvePackagingHeaderNames({
    category: '包装',
    metadata: {
      internal_name: '历史内部名',
      external_name: '历史外协名',
    },
    items: [],
  } as any, mapping, {
    match: () => 'should-not-happen',
  });

  assert.equal(result.internalName, '历史内部名');
  assert.equal(result.externalName, '历史外协名');
});
