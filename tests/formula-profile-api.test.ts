import test from 'node:test';
import assert from 'node:assert/strict';
import { formulaProfileApi } from '../src/services/formulaProfileApi';
import { api } from '../src/lib/api';

type ApiLike = typeof api;
const originalApiGet = api.get;
const originalApiPost = api.post;
const originalApiPut = api.put;
const originalApiDelete = api.delete;

test.after(() => {
  api.get = originalApiGet as ApiLike['get'];
  api.post = originalApiPost as ApiLike['post'];
  api.put = originalApiPut as ApiLike['put'];
  api.delete = originalApiDelete as ApiLike['delete'];
});

test('formulaProfileApi.profileDetail parses unified formulas profile detail', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/profiles/formulas/detail');
    return {
      success: true,
      detail: {
        profile: {
          code: 'formulas',
          displayName: '配方配置',
          domain: 'formula',
          workflowKind: 'collection',
          status: 'active',
          activeRevision: null,
          capabilities: { publish: false },
        },
        collection: {
          total: 12,
          page: 1,
          pageSize: 20,
          previewItems: [],
        },
        publishedPayload: { F001: { displayName: '配方A', bom: [] } },
      },
    } as any;
  }) as ApiLike['get'];

  const detail = await formulaProfileApi.profileDetail();
  assert.equal(detail.profile.code, 'formulas');
  assert.equal(detail.profile.workflowKind, 'collection');
  assert.equal(detail.collection.total, 12);
  assert.ok(detail.publishedPayload.F001);
});

test('formulaProfileApi uses profile bridge item endpoints for list/detail/revisions', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(url);
    if (url === '/config/profiles/formulas/items') {
      return { items: [], total: 0, page: 1, pageSize: 20 } as any;
    }
    if (url === '/config/profiles/formulas/items/F001') {
      return { formula: { id: 1, formulaKey: 'F001', displayName: '配方A', status: 'draft', activeRevision: null, bom: [], updatedAt: '' }, draftRevision: null, publishedRevision: null } as any;
    }
    if (url === '/config/profiles/formulas/items/F001/revisions') {
      return { success: true, items: [] } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];

  await formulaProfileApi.list({ page: 1 });
  await formulaProfileApi.detail('F001');
  await formulaProfileApi.revisions('F001');

  assert.deepEqual(calls, [
    '/config/profiles/formulas/items',
    '/config/profiles/formulas/items/F001',
    '/config/profiles/formulas/items/F001/revisions',
  ]);
});

test('formulaProfileApi uses profile bridge item endpoints for mutations', async () => {
  const calls: Array<{ method: string; url: string }> = [];
  api.post = (async (url: string) => {
    calls.push({ method: 'POST', url });
    return { success: true, revision: { revision: 2 }, formula: { formulaKey: 'F001', displayName: 'A', status: 'draft', activeRevision: null } } as any;
  }) as ApiLike['post'];
  api.put = (async (url: string) => {
    calls.push({ method: 'PUT', url });
    return { success: true, revision: { revision: 3 } } as any;
  }) as ApiLike['put'];
  api.delete = (async (url: string) => {
    calls.push({ method: 'DELETE', url });
    return { success: true } as any;
  }) as ApiLike['delete'];

  await formulaProfileApi.create({ formulaKey: 'F001', displayName: 'A', bom: [] });
  await formulaProfileApi.updateDraft('F001', { revision: 1, formulaKey: 'F001', displayName: 'A', bom: [] });
  await formulaProfileApi.publish('F001', { fromRevision: 3 });
  await formulaProfileApi.archive('F001', {});
  await formulaProfileApi.rollback('F001', { targetRevision: 2 });
  await formulaProfileApi.remove('F001', {});

  assert.deepEqual(calls, [
    { method: 'POST', url: '/config/profiles/formulas/items' },
    { method: 'PUT', url: '/config/profiles/formulas/items/F001/draft' },
    { method: 'POST', url: '/config/profiles/formulas/items/F001/publish' },
    { method: 'POST', url: '/config/profiles/formulas/items/F001/archive' },
    { method: 'POST', url: '/config/profiles/formulas/items/F001/rollback' },
    { method: 'DELETE', url: '/config/profiles/formulas/items/F001' },
  ]);
});
