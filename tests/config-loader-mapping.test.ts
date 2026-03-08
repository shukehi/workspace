import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigLoaderService } from '../src/services/configLoader';

type MockResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

function createResponse(ok: boolean, payload: unknown): MockResponse {
  return {
    ok,
    json: async () => payload,
  };
}

const originalFetch = globalThis.fetch;

test.after(() => {
  globalThis.fetch = originalFetch;
});

test('configLoader: packaging mapping prefers API and normalizes legacy dictionary payload', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/packaging') {
      return createResponse(true, { 包装A: '外协包装A' }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService();
  await loader.loadPackagingMapping();

  assert.deepEqual(calls, ['/api/config/packaging']);
  assert.deepEqual(loader.getPackagingMapping(), {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });
});

test('configLoader: packaging mapping keeps JSON fallback when API is unavailable', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/packaging') {
      return createResponse(false, null) as unknown as Response;
    }
    if (url === '/data/packaging-mapping.json') {
      return createResponse(true, {
        supplierName: '回退包装供应商',
        mappings: { 包装B: '外协包装B' },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService();
  await loader.loadPackagingMapping();

  assert.deepEqual(calls, [
    '/api/config/packaging',
    '/data/packaging-mapping.json',
  ]);
  assert.deepEqual(loader.getPackagingMapping(), {
    supplierName: '回退包装供应商',
    mappings: { 包装B: '外协包装B' },
  });
});

test('configLoader: cylinder and lock-fork loaders normalize static payloads through adapters', async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === '/data/cylinder-mapping.json') {
      return createResponse(true, {
        dimensions: {
          7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
        },
        mappings: {
          锁芯A: { supplier: '忠恒', template: '{code}锁芯A' },
        },
      }) as unknown as Response;
    }

    if (url === '/data/lock-fork-mapping.json') {
      return createResponse(true, {
        baseDimensions: {
          7: {
            standard: {
              upper: { base1: 570, base2: 301 },
              lower: { base1: 570, base2: 301 },
            },
          },
        },
        suppliers: {
          default: '应志友',
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService();
  await loader.loadCylinderMapping();
  await loader.loadLockForkMapping();

  assert.equal(loader.getCylinderMapping().dimensions['7']?.code, '90AB');
  assert.equal(loader.getCylinderMapping().mappings['锁芯A']?.supplier, '忠恒');
  assert.equal(loader.getLockForkMapping().hangingFeet.standard, 35);
  assert.deepEqual(loader.getLockForkMapping().hangingFeet.keywords, ['吊脚', 'diaojiao']);
  assert.equal(loader.getLockForkMapping().suppliers.default, '应志友');
});

test('configLoader: handle loader normalizes payloads through adapter', async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === '/api/config/handle') {
      return createResponse(true, {
        defaultSupplier: '拉手供应商A',
        unmatchedSupplier: '待人工处理',
        manualReviewLabel: '未匹配拉手(待人工处理)',
        singleKeywords: ['单活'],
        doubleKeywords: ['双活'],
        thicknessAccessoryPacks: { '10': '10公分配件包' },
        mappings: {},
      }) as unknown as Response;
    }
    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService();
  await loader.loadHandleMapping();

  assert.equal(loader.getHandleMapping().defaultSupplier, '拉手供应商A');
  assert.equal(loader.getHandleMapping().thicknessAccessoryPacks['10'], '10公分配件包');
  assert.equal(loader.getHandleMapping().thicknessAccessoryPacks['7'], '7公分配件包');
});
