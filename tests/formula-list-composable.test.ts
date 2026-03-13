import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { useFormulaList } from '../src/features/formulas/composables/useFormulaList';
import type { FormulaSummary } from '../src/types/formula';

function createSummary(formulaKey: string): FormulaSummary {
  return {
    id: Number(formulaKey.replace(/\D/g, '') || 1),
    formulaKey,
    displayName: formulaKey,
    status: 'draft',
    activeRevision: null,
    updatedAt: '2026-03-13T00:00:00.000Z',
  };
}

test('formula list composable prepends local draft and loads first detail when selection is missing', async () => {
  const selectedKey = ref('');
  const localDraftSummary = ref<FormulaSummary | null>(createSummary('__local_draft__:1'));
  const detailLoads: Array<{ formulaKey: string; silent?: boolean }> = [];

  const listState = useFormulaList({
    selectedKey,
    localDraftSummary,
    isLocalFormulaKey: (formulaKey) => formulaKey.startsWith('__local_draft__:'),
    loadDetail: async (formulaKey, silent) => {
      detailLoads.push({ formulaKey, silent });
    },
    clearSelection: () => {
      selectedKey.value = '';
    },
    onLoadError: () => {
      throw new Error('should not hit load error');
    },
    api: {
      async list() {
        return {
          items: [createSummary('F20260313-0001')],
          total: 1,
          page: 1,
          pageSize: 20,
        };
      },
    },
  });

  await listState.loadList();

  assert.equal(listState.list.value[0].formulaKey, '__local_draft__:1');
  assert.equal(listState.list.value[1].formulaKey, 'F20260313-0001');
  assert.equal(listState.displayTotal.value, 2);
  assert.deepEqual(detailLoads, [{ formulaKey: '__local_draft__:1', silent: true }]);
});

test('formula list composable appends unique remote items only', async () => {
  const selectedKey = ref('F20260313-0001');
  const localDraftSummary = ref<FormulaSummary | null>(null);
  let callCount = 0;

  const listState = useFormulaList({
    selectedKey,
    localDraftSummary,
    isLocalFormulaKey: () => false,
    loadDetail: async () => {},
    clearSelection: () => {},
    onLoadError: () => {
      throw new Error('should not hit load error');
    },
    api: {
      async list() {
        callCount += 1;
        if (callCount === 1) {
          return {
            items: [createSummary('F20260313-0001')],
            total: 2,
            page: 1,
            pageSize: 20,
          };
        }
        return {
          items: [createSummary('F20260313-0001'), createSummary('F20260313-0002')],
          total: 2,
          page: 2,
          pageSize: 20,
        };
      },
    },
  });

  await listState.loadList();
  await listState.loadNextPage();

  assert.deepEqual(
    listState.list.value.map((item) => item.formulaKey),
    ['F20260313-0001', 'F20260313-0002'],
  );
  assert.equal(listState.hasMore.value, false);
});
