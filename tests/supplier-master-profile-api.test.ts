import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierMasterProfileApi } from '../src/services/supplierMasterProfileApi';
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

test('supplierMasterProfileApi.detail reads unified supplier_master profile detail', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/profiles/supplier_master/detail');
    return {
      success: true,
      detail: {
        profile: {
          code: 'supplier_master',
          displayName: '供应商主数据',
          domain: 'catalog',
          workflowKind: 'collection',
          status: 'active',
          activeRevision: null,
          capabilities: {},
        },
        collection: {
          total: 1,
          page: 1,
          pageSize: 1,
          previewItems: [
            { supplierName: '供应商A', normalizedName: '供应商a', sources: ['material-master'], materialCount: 1, linkedMaterialCount: 1, linkedMaterialCodes: ['M001'], hasLinkedMaterialsWhileInactive: false, persisted: true },
          ],
        },
      },
    } as any;
  }) as ApiLike['get'];

  const detail = await supplierMasterProfileApi.detail();
  assert.equal(detail.profile.code, 'supplier_master');
  assert.equal(detail.collection.total, 1);
  assert.equal(detail.collection.previewItems[0].supplierName, '供应商A');
});

test('supplierMasterProfileApi list/create/update/archive/linkedMaterials use unified supplier_master item routes', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(`GET ${url}`);
    if (url === '/config/profiles/supplier_master/items') {
      return { success: true, items: [] } as any;
    }
    if (url === '/config/profiles/supplier_master/items/1/materials') {
      return { success: true, items: [{ id: 1, code: 'M001', name: '材料A', category: 'Raw', supplier: '供应商A', supplierMasterId: 1, updatedAt: null }] } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];
  api.post = (async (url: string) => {
    calls.push(`POST ${url}`);
    return { success: true, item: { id: 1, supplierName: '供应商A', hasLinkedMaterialsWhileInactive: false } } as any;
  }) as ApiLike['post'];
  api.put = (async (url: string) => {
    calls.push(`PUT ${url}`);
    return { success: true, item: { id: 1, supplierName: '供应商A-更新', hasLinkedMaterialsWhileInactive: false } } as any;
  }) as ApiLike['put'];

  await supplierMasterProfileApi.list();
  await supplierMasterProfileApi.create({ supplierName: '供应商A' });
  await supplierMasterProfileApi.update(1, { supplierName: '供应商A-更新' });
  await supplierMasterProfileApi.archive(1);
  await supplierMasterProfileApi.linkedMaterials(1);

  assert.deepEqual(calls, [
    'GET /config/profiles/supplier_master/items',
    'POST /config/profiles/supplier_master/items',
    'PUT /config/profiles/supplier_master/items/1',
    'POST /config/profiles/supplier_master/items/1/archive',
    'GET /config/profiles/supplier_master/items/1/materials',
  ]);
});
