import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearSourceOrderSnapshot,
  loadSourceOrderSnapshot,
  persistSourceOrderSnapshot,
} from '../src/features/source-analysis/services/sourceOrderSnapshot';

function createLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test('source order snapshot persists, loads and clears valid order snapshots', () => {
  Object.assign(globalThis, {
    window: {
      localStorage: createLocalStorage(),
    },
  });

  persistSourceOrderSnapshot({ code: 'C-001', list: [{ id: 1 }] });
  assert.deepEqual(loadSourceOrderSnapshot(), { code: 'C-001', list: [{ id: 1 }] });

  clearSourceOrderSnapshot();
  assert.equal(loadSourceOrderSnapshot(), null);
});
