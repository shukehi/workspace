import test from 'node:test';
import assert from 'node:assert/strict';
import { useMaterialsPageState } from '../src/features/materials/composables/useMaterialsPageState';

test('useMaterialsPageState exposes stable materials tabs and selection', () => {
  const state = useMaterialsPageState();

  assert.deepEqual(
    state.tabs.value.map((tab) => tab.key),
    ['raw', 'hardware', 'packaging'],
  );
  assert.equal(state.activeTab.value, 'raw');

  state.setActiveTab('packaging');

  assert.equal(state.activeTab.value, 'packaging');
});
