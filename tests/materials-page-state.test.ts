import test from 'node:test';
import assert from 'node:assert/strict';
import { setActivePinia, createPinia } from 'pinia';
import { useMaterialsPageState } from '../src/features/materials/composables/useMaterialsPageState';
import { useSourceStore } from '../src/stores/useSourceStore';

test('useMaterialsPageState exposes stable materials tabs, selection, and source-derived views', () => {
  setActivePinia(createPinia());
  const sourceStore = useSourceStore();
  sourceStore.currentOrder = { code: 'C-001', list: [{ id: 1 }] } as any;
  sourceStore.analysisResult = {
    flatMaterials: [{ code: 'M1' }],
    flatCylinders: [{ code: 'C1' }],
    flatLocks: [{ code: 'L1' }],
    flatHandles: [{ code: 'H1' }],
    flatForks: [{ code: 'F1' }],
    flatAccessories: [{ code: 'A1' }],
    flatPackaging: [{ code: 'P1' }],
  } as any;
  const state = useMaterialsPageState();

  assert.deepEqual(
    state.tabs.value.map((tab) => tab.key),
    ['raw', 'hardware', 'packaging'],
  );
  assert.equal(state.activeTab.value, 'raw');

  state.setActiveTab('packaging');

  assert.equal(state.activeTab.value, 'packaging');
});
