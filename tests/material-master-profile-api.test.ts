import test from 'node:test';
import assert from 'node:assert/strict';
import { materialMasterProfileApi } from '../src/services/materialMasterProfileApi';
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

test('materialMasterProfileApi detail/list/create/update use unified material_master profile routes', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(`GET ${url}`);
    if (url === '/config/profiles/material_master/detail') {
      return {
        success: true,
        detail: {
          profile: { code: 'material_master', workflowKind: 'collection' },
          collection: { total: 1, page: 1, pageSize: 1, previewItems: [] },
        },
      } as any;
    }
    if (url === '/config/profiles/material_master/reference-check') {
      return {
        success: true,
        check: {
          profileCode: 'material_master',
          supplierRefs: ['供应商A'],
          materialCodeRefs: ['M1'],
          missingMaterialCodes: [],
          suppliersMissingInMaterialMaster: [],
          suppliersMissingInSupplierMaster: [],
          hasIssues: false,
        },
      } as any;
    }
    if (url === '/config/profiles/material_master/items') {
      return { success: true, items: [] } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];
  api.post = (async (url: string) => {
    calls.push(`POST ${url}`);
    return { success: true, item: { id: 1, code: 'M1', supplierMaster: { id: 3, supplier_name: '供应商A', normalized_name: '供应商a', status: 'active' } } } as any;
  }) as ApiLike['post'];
  api.put = (async (url: string) => {
    calls.push(`PUT ${url}`);
    return { success: true, item: { id: 1, code: 'M1', supplierMaster: { id: 3, supplier_name: '供应商A', normalized_name: '供应商a', status: 'active' } } } as any;
  }) as ApiLike['put'];

  await materialMasterProfileApi.detail();
  await materialMasterProfileApi.referenceCheck();
  await materialMasterProfileApi.list();
  await materialMasterProfileApi.create({ code: 'M1' } as any);
  await materialMasterProfileApi.update(1, { code: 'M1' } as any);

  assert.deepEqual(calls, [
    'GET /config/profiles/material_master/detail',
    'GET /config/profiles/material_master/reference-check',
    'GET /config/profiles/material_master/items',
    'POST /config/profiles/material_master/items',
    'PUT /config/profiles/material_master/items/1',
  ]);
});
