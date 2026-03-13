import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useFormulaDetail } from '../src/features/formulas/composables/useFormulaDetail';
import type { FormulaBOMItem, FormulaDetail, FormulaRevisionMeta } from '../src/types/formula';

function createDetail(formulaKey: string): FormulaDetail {
  return {
    id: 1,
    formulaKey,
    displayName: formulaKey,
    status: 'draft',
    activeRevision: 1,
    bom: [],
    updatedAt: '2026-03-13T00:00:00.000Z',
  };
}

function createRevision(revision: number): FormulaRevisionMeta {
  return {
    id: revision,
    revision,
    state: 'draft',
    createdBy: 'tester',
    createdAt: '2026-03-13T00:00:00.000Z',
  };
}

test('formula detail composable loads detail and revisions into refs', async () => {
  const selectedKey = ref('');
  const detail = ref<FormulaDetail | null>(null);
  const draftRevision = ref<FormulaRevisionMeta | null>(null);
  const publishedRevision = ref<FormulaRevisionMeta | null>(null);
  const revisions = ref<FormulaRevisionMeta[]>([]);
  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<Record<string, string>>({});
  let resetCalled = 0;

  const state = useFormulaDetail({
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    bomDraft,
    validationErrors,
    resetDraftWithDetail: () => {
      resetCalled += 1;
    },
    onLoadError: () => {
      throw new Error('should not hit load error');
    },
    api: {
      async detail(formulaKey: string) {
        return {
          formula: createDetail(formulaKey),
          draftRevision: createRevision(2),
          publishedRevision: createRevision(1),
        };
      },
      async revisions() {
        return {
          success: true,
          items: [createRevision(2), createRevision(1)],
        };
      },
    },
  });

  const ok = await state.loadRemoteDetail('F20260313-0001');

  assert.equal(ok, true);
  assert.equal(selectedKey.value, 'F20260313-0001');
  assert.equal(detail.value?.formulaKey, 'F20260313-0001');
  assert.equal(draftRevision.value?.revision, 2);
  assert.equal(publishedRevision.value?.revision, 1);
  assert.deepEqual(revisions.value.map((item) => item.revision), [2, 1]);
  assert.equal(resetCalled, 1);
});

test('formula detail composable applies local draft detail without remote revisions', () => {
  const selectedKey = ref('');
  const detail = ref<FormulaDetail | null>(null);
  const draftRevision = ref<FormulaRevisionMeta | null>(createRevision(2));
  const publishedRevision = ref<FormulaRevisionMeta | null>(createRevision(1));
  const revisions = ref<FormulaRevisionMeta[]>([createRevision(2)]);
  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<Record<string, string>>({ displayName: 'required' });

  const state = useFormulaDetail({
    selectedKey,
    detail,
    draftRevision,
    publishedRevision,
    revisions,
    bomDraft,
    validationErrors,
    resetDraftWithDetail: () => {},
    onLoadError: () => {},
  });

  const localBom: FormulaBOMItem[] = [{
    materialId: '8181',
    position: '门框',
    materialCategory: '油漆',
    supplier: '华荣',
    usage: { single: 1, double: 0, paired: 0 },
  }];
  state.applyLocalDraftDetail('__local_draft__:1', createDetail('__local_draft__:1'), localBom);

  assert.equal(selectedKey.value, '__local_draft__:1');
  assert.equal(detail.value?.formulaKey, '__local_draft__:1');
  assert.equal(draftRevision.value, null);
  assert.equal(publishedRevision.value, null);
  assert.deepEqual(revisions.value, []);
  assert.deepEqual(bomDraft.value, localBom);
  assert.deepEqual(validationErrors.value, {});
});
