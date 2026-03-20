import test from 'node:test';
import assert from 'node:assert/strict';
import { createPinia, setActivePinia } from 'pinia';
import { api } from '../src/lib/api';
import { useProcurementStore } from '../src/stores/useProcurementStore';

test('bulkMarkOrdersArrived posts ids to the bulk arrive endpoint', async () => {
  setActivePinia(createPinia());
  const store = useProcurementStore();
  const originalPost = api.post;
  const requests: Array<{ url: string; payload: unknown }> = [];

  api.post = (async (url: string, payload: unknown) => {
    requests.push({ url, payload });
    return {
      total: 2,
      successCount: 2,
      failureCount: 0,
      succeededIds: [11, 12],
      failed: [],
    };
  }) as any;

  try {
    const result = await store.bulkMarkOrdersArrived([11, 12], {
      arrived_at: '2026-03-20T12:00:00.000Z',
    });

    assert.equal(result.successCount, 2);
  } finally {
    api.post = originalPost;
  }

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/orders/bulk-arrive');
  assert.deepEqual(requests[0].payload, {
    ids: [11, 12],
    arrived_at: '2026-03-20T12:00:00.000Z',
  });
});
