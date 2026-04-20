import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { runSourceOrderRehydrate } from '../src/features/source-analysis/services/sourceOrderRehydrateRunner';

test('source order rehydrate runner skips when no snapshot order exists', async () => {
  let called = false;
  await runSourceOrderRehydrate({
    state: { currentOrder: ref<any>(null) },
    calculateMaterials: async () => {
      called = true;
    },
    warn: () => undefined,
  });

  assert.equal(called, false);
});

test('source order rehydrate runner delegates calculation and warning behavior', async () => {
  const calls: string[] = [];
  await runSourceOrderRehydrate({
    state: { currentOrder: ref<any>({ code: 'SNAP', list: [{ id: 1 }] }) },
    calculateMaterials: async () => {
      calls.push('calculate');
      throw new Error('rehydrate failed');
    },
    warn: (error) => {
      calls.push(`warn:${(error as Error).message}`);
    },
  });

  assert.deepEqual(calls, ['calculate', 'warn:rehydrate failed']);
});
