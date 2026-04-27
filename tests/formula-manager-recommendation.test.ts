import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { useFormulaManager } from '../src/features/formulas/composables/useFormulaManager';
import { formulaProfileApi } from '../src/services/formulaProfileApi';
import type { FormulaDetail } from '../src/types/formula';

type FormulaProfileApi = typeof formulaProfileApi;

const originalBomRecommendation = formulaProfileApi.bomRecommendation;
const originalList = formulaProfileApi.list;
const originalCreate = formulaProfileApi.create;
const originalUpdateDraft = formulaProfileApi.updateDraft;
const originalPublish = formulaProfileApi.publish;
const originalWindow = globalThis.window;

function createDetail(): FormulaDetail {
  return {
    id: 1,
    formulaKey: 'F20260427-0001',
    displayName: '当前配方',
    status: 'draft',
    activeRevision: 1,
    bom: [],
    updatedAt: '2026-04-27T00:00:00.000Z',
  };
}

test.beforeEach(() => {
  setActivePinia(createPinia());
});

test.afterEach(() => {
  formulaProfileApi.bomRecommendation = originalBomRecommendation as FormulaProfileApi['bomRecommendation'];
  formulaProfileApi.list = originalList as FormulaProfileApi['list'];
  formulaProfileApi.create = originalCreate as FormulaProfileApi['create'];
  formulaProfileApi.updateDraft = originalUpdateDraft as FormulaProfileApi['updateDraft'];
  formulaProfileApi.publish = originalPublish as FormulaProfileApi['publish'];
  Object.defineProperty(globalThis, 'window', {
    value: originalWindow,
    configurable: true,
    writable: true,
  });
});

test('formula manager applies BOM recommendations only to local draft state', async () => {
  const calls: string[] = [];
  formulaProfileApi.bomRecommendation = (async (params) => {
    calls.push(`bom:${params?.sourceFormulaKey}`);
    return {
      rows: [{
        materialId: 'M001',
        position: 'main',
        materialCategory: '油漆',
        supplier: '供应商A',
        usage: { single: 1, double: 2, paired: 3 },
      }],
      source: { type: 'published_formula', formulaKey: 'F20260427-0002', displayName: '来源配方' },
      confidence: 0.7,
      explanation: 'Draft candidates copied from a published formula.',
      warnings: [],
      readOnly: true,
      sideEffect: 'none',
    };
  }) as FormulaProfileApi['bomRecommendation'];
  formulaProfileApi.create = (async () => {
    throw new Error('recommendation must not create a formula');
  }) as FormulaProfileApi['create'];
  formulaProfileApi.updateDraft = (async () => {
    throw new Error('recommendation must not save a draft');
  }) as FormulaProfileApi['updateDraft'];
  formulaProfileApi.publish = (async () => {
    throw new Error('recommendation must not publish');
  }) as FormulaProfileApi['publish'];

  const manager = useFormulaManager();
  manager.detail.value = createDetail();
  manager.recommendationSourceKey.value = 'F20260427-0002';
  manager.validationErrors.value = { bom: 'old error' };

  await manager.applyBomRecommendation();

  assert.deepEqual(calls, ['bom:F20260427-0002']);
  assert.equal(manager.bomDraft.value.length, 1);
  assert.equal(manager.bomDraft.value[0].materialId, 'M001');
  assert.equal(manager.bomDraft.value[0].usage.paired, 3);
  assert.deepEqual(manager.validationErrors.value, {});
  assert.equal(manager.recommendation.value?.readOnly, true);
  assert.equal(manager.recommendation.value?.sideEffect, 'none');
  assert.equal(manager.isDirty.value, true);
});

test('formula manager keeps existing BOM when recommendation overwrite is cancelled', async () => {
  let recommendationCalls = 0;
  formulaProfileApi.bomRecommendation = (async () => {
    recommendationCalls += 1;
    throw new Error('recommendation must not be fetched after cancel');
  }) as FormulaProfileApi['bomRecommendation'];
  Object.defineProperty(globalThis, 'window', {
    value: {
      ...originalWindow,
      confirm: () => false,
      onbeforeunload: null,
    },
    configurable: true,
    writable: true,
  });

  const manager = useFormulaManager();
  manager.detail.value = createDetail();
  manager.recommendationSourceKey.value = 'F20260427-0002';
  manager.bomDraft.value = [{
    materialId: 'OLD',
    position: 'main',
    materialCategory: '油漆',
    supplier: '供应商A',
    usage: { single: 1, double: 1, paired: 1 },
  }];

  await manager.applyBomRecommendation();

  assert.equal(recommendationCalls, 0);
  assert.equal(manager.bomDraft.value[0].materialId, 'OLD');
  assert.equal(manager.recommendation.value, null);
});

test('formula manager loads only published formulas as recommendation sources', async () => {
  formulaProfileApi.list = (async (params) => {
    assert.deepEqual(params, { status: 'published', page: 1, pageSize: 200 });
    return {
      items: [
        { id: 1, formulaKey: 'F-PUB', displayName: '已发布', status: 'published', activeRevision: 1, updatedAt: '' },
        { id: 2, formulaKey: 'F-DRAFT', displayName: '草稿', status: 'draft', activeRevision: null, updatedAt: '' },
      ],
      total: 2,
      page: 1,
      pageSize: 200,
    };
  }) as FormulaProfileApi['list'];

  const manager = useFormulaManager();
  await manager.loadRecommendationSources();

  assert.deepEqual(manager.recommendationSources.value.map((item) => item.formulaKey), ['F-PUB']);
  assert.equal(manager.recommendationSourceKey.value, 'F-PUB');
});
