import test from 'node:test';
import assert from 'node:assert/strict';
import { materialMasterApi } from '../src/services/materialMasterApi';
import { api } from '../src/lib/api';

type ApiLike = typeof api;
const originalGet = api.get;
const originalPost = api.post;
const originalPut = api.put;

test.after(() => {
  api.get = originalGet as ApiLike['get'];
  api.post = originalPost as ApiLike['post'];
  api.put = originalPut as ApiLike['put'];
});

test('materialMasterApi uses lower-level master-data routes', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(`GET ${url}`);
    if (url === '/config/masters/materials') {
      return { success: true, items: [] } as any;
    }
    if (url === '/config/masters/materials/detail') {
      return { success: true, detail: { profile: { code: 'material_master' }, total: 0, items: [] } } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];
  api.post = (async (url: string) => {
    calls.push(`POST ${url}`);
    return { success: true, item: { id: 1, code: 'M1' } } as any;
  }) as ApiLike['post'];
  api.put = (async (url: string) => {
    calls.push(`PUT ${url}`);
    return { success: true, item: { id: 1, code: 'M1' } } as any;
  }) as ApiLike['put'];

  await materialMasterApi.list();
  await materialMasterApi.detail();
  await materialMasterApi.create({ code: 'M1' } as any);
  await materialMasterApi.update(1, { code: 'M1' } as any);

  assert.deepEqual(calls, [
    'GET /config/masters/materials',
    'GET /config/masters/materials/detail',
    'POST /config/masters/materials',
    'PUT /config/masters/materials/1',
  ]);
});
