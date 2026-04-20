import test from 'node:test';
import assert from 'node:assert/strict';
import { applySourceOrderContractCache } from '../src/features/source-analysis/services/sourceOrderContractCacheApplier';

test('source order contract cache applier skips cache when persistCache=false', async () => {
  let callCount = 0;
  await applySourceOrderContractCache({
    orderData: { code: 'C-001', list: [{ id: 1 }] },
    persistCache: false,
    cacheErpContractSnapshot: async () => {
      callCount += 1;
    },
  });

  assert.equal(callCount, 0);
});

test('source order contract cache applier warns and swallows cache failures', async () => {
  const calls: string[] = [];
  await applySourceOrderContractCache({
    orderData: { code: 'C-002', list: [{ id: 2 }] },
    cacheErpContractSnapshot: async () => {
      throw new Error('cache failed');
    },
    warn: (message, error) => {
      calls.push(`${message}:${(error as Error).message}`);
    },
  });

  assert.deepEqual(calls, ['[SourceStore] failed to cache ERP contract snapshot::cache failed']);
});
