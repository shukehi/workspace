import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useFormulaLocalDraft } from '../src/features/formulas/composables/useFormulaLocalDraft';
import type { FormulaBOMItem, FormulaDetail, FormulaSummary } from '../src/types/formula';

function createDetail(formulaKey = ''): FormulaDetail {
  return {
    id: 1,
    formulaKey,
    displayName: '测试配方',
    status: 'draft',
    activeRevision: null,
    bom: [],
    updatedAt: '2026-03-13T00:00:00.000Z',
  };
}

test('formula local draft composable creates and clears local draft entries', () => {
  const selectedKey = ref('');
  const detail = ref<FormulaDetail | null>(null);
  const bomDraft = ref<FormulaBOMItem[]>([]);
  const validationErrors = ref<Record<string, string>>({});
  const changeNote = ref('old');
  const list = ref<FormulaSummary[]>([]);

  const state = useFormulaLocalDraft({
    selectedKey,
    detail,
    bomDraft,
    validationErrors,
  });

  state.createLocalDraft(list, () => {
    selectedKey.value = '';
    detail.value = null;
  }, changeNote);

  assert.equal(state.localDraftSummary.value?.formulaKey.startsWith('__local_draft__:'), true);
  assert.equal(state.isDirty.value, true);
  assert.equal(list.value.length, 1);
  assert.equal(changeNote.value, '');

  const localKey = state.localDraftSummary.value?.formulaKey || '';
  state.clearLocalDraft((formulaKey) => {
    list.value = list.value.filter((item) => item.formulaKey !== formulaKey);
  });

  assert.equal(state.localDraftSummary.value, null);
  assert.equal(state.localDraftDetail.value, null);
  assert.equal(list.value.some((item) => item.formulaKey === localKey), false);
});

test('formula local draft composable marks dirty and syncs local draft snapshot', () => {
  const selectedKey = ref('__local_draft__:1');
  const detail = ref<FormulaDetail | null>({
    ...createDetail(''),
    displayName: '已修改配方',
    bom: [],
  });
  const bomDraft = ref<FormulaBOMItem[]>([{
    materialId: '8181',
    position: '门框',
    materialCategory: '油漆',
    supplier: '华荣',
    usage: { single: 1, double: 0, paired: 0 },
  }]);
  const validationErrors = ref<Record<string, string>>({ old: 'x' });

  const state = useFormulaLocalDraft({
    selectedKey,
    detail,
    bomDraft,
    validationErrors,
  });

  state.localDraftSummary.value = {
    id: 1,
    formulaKey: '__local_draft__:1',
    displayName: '',
    status: 'draft',
    activeRevision: null,
    updatedAt: '',
  };
  state.localDraftDetail.value = createDetail('');
  state.markDirty();

  assert.equal(state.isDirty.value, true);
  assert.equal(state.localDraftSummary.value?.displayName, '已修改配方');
  assert.equal(state.localDraftDetail.value?.bom[0].materialId, '8181');

  state.resetDraftWithDetail();
  assert.equal(state.isDirty.value, false);
  assert.deepEqual(validationErrors.value, {});
});
