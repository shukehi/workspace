import test from 'node:test';
import assert from 'node:assert/strict';
import { supplierMasterApi } from '../src/services/supplierMasterApi';
import { api } from '../src/lib/api';

type ApiLike = typeof api;
const originalGet = api.get;

test.after(() => {
  api.get = originalGet as ApiLike['get'];
});

test('supplierMasterApi.list reads unified supplier master route', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/masters/suppliers');
    return {
      success: true,
      items: [
        { supplierName: '供应商A', normalizedName: '供应商a', sources: ['material-master'], materialCount: 2 },
      ],
    } as any;
  }) as ApiLike['get'];

  const items = await supplierMasterApi.list();
  assert.equal(items.length, 1);
  assert.equal(items[0].supplierName, '供应商A');
});
