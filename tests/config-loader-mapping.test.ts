import test from 'node:test';
import assert from 'node:assert/strict';
import { ConfigLoaderService } from '../src/services/configLoader';
import { ApiWithStaticFallbackConfigRepository, type ConfigRepository } from '../src/services/configRepository';

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

    if (url === '/api/config/profiles/packaging/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: { 包装A: '外协包装A' },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadPackagingMapping();

  assert.deepEqual(calls, ['/api/config/profiles/packaging/detail']);
  assert.deepEqual(loader.getPackagingMapping(), {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });
  assert.equal(loader.getLoadSources().packaging, 'api');
});

test('configLoader: packaging mapping uses published profile supplier as owner', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/profiles/packaging/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            supplierName: '配置中心包装供应商',
            mappings: { 包装A: '外协包装A' },
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadPackagingMapping();

  assert.deepEqual(calls, ['/api/config/profiles/packaging/detail']);
  assert.equal(loader.getPackagingMapping().supplierName, '配置中心包装供应商');
  assert.equal(loader.getPackagingMapping().mappings['包装A'], '外协包装A');
  assert.equal(loader.getLoadSources().packaging, 'api');
});

test('configLoader: materials prefer workflow published endpoint before legacy config endpoint', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/profiles/material_catalog/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            M001: {
              supplier: '供应商A',
              name: '材料A',
            },
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadMaterials();

  assert.deepEqual(calls, ['/api/config/profiles/material_catalog/detail']);
  assert.equal(loader.getLoadSources().materials, 'api');
  assert.equal(loader.getMaterials().M001?.name, '材料A');
});

test('configLoader: materials reject missing workflow payload without static fallback', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/profiles/material_catalog/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: null,
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await assert.rejects(
    () => loader.loadMaterials(),
    /Failed to load published material catalog from Config Center/,
  );

  assert.deepEqual(calls, ['/api/config/profiles/material_catalog/detail']);
});

test('configLoader: formulas fallback reads unified formulas profile detail payload', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);

    if (url === '/api/config/profiles/formulas/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            F001: { displayName: '配方A', bom: [] },
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadFormulas();

  assert.deepEqual(calls, ['/api/config/profiles/formulas/detail']);
  assert.equal(loader.getLoadSources().formulas, 'api');
  assert.ok(loader.getFormulas().F001);
});

test('configLoader: packaging mapping fails when published API is unavailable', async () => {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await assert.rejects(
    () => loader.loadPackagingMapping(),
    /Failed to load published mapping for packaging/,
  );

  assert.deepEqual(calls, ['/api/config/profiles/packaging/detail']);
});

test('configLoader: cylinder and lock-fork loaders normalize published payloads through adapters', async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === '/api/config/profiles/cylinder/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            dimensions: {
              7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
            },
            mappings: {
              锁芯A: { supplier: '忠恒', template: '{code}锁芯A' },
            },
          },
        },
      }) as unknown as Response;
    }

    if (url === '/api/config/profiles/lock_fork/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
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
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadCylinderMapping();
  await loader.loadLockForkMapping();

  assert.equal(loader.getCylinderMapping().dimensions['7']?.code, '90AB');
  assert.equal(loader.getCylinderMapping().mappings['锁芯A']?.supplier, '忠恒');
  assert.equal(loader.getLockForkMapping().hangingFeet.standard, 35);
  assert.deepEqual(loader.getLockForkMapping().hangingFeet.keywords, ['吊脚', 'diaojiao']);
  assert.equal(loader.getLockForkMapping().suppliers.default, '应志友');
  assert.equal(loader.getLoadSources().cylinder, 'api');
  assert.equal(loader.getLoadSources().lockFork, 'api');
});

test('configLoader: lock loader normalizes published payloads through adapter', async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === '/api/config/profiles/lock/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            defaultUnit: '   ',
            primaryLabel: '',
            mappings: {
              'SD-9030（6607大锁）': {
                supplier: '汇成',
                vendorName: '6607大锁',
                primarySpec: '主锁体',
              },
            },
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadLockMapping();

  assert.equal(loader.getLockMapping().defaultUnit, '套');
  assert.equal(loader.getLockMapping().primaryLabel, '主锁');
  assert.equal(loader.getLockMapping().secondaryLabel, '副锁');
  assert.equal(loader.getLockMapping().mappings['SD-9030（6607大锁）']?.vendorName, '6607大锁');
  assert.equal(loader.getLockMapping().mappings['SD-9030（6607大锁）']?.primarySpec, '主锁体');
  assert.equal(loader.getLoadSources().lock, 'api');
});

test('configLoader: handle loader normalizes payloads through adapter', async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);

    if (url === '/api/config/profiles/handle/detail') {
      return createResponse(true, {
        success: true,
        detail: {
          publishedPayload: {
            defaultSupplier: '拉手供应商A',
            unmatchedSupplier: '待人工处理',
            manualReviewLabel: '未匹配拉手(待人工处理)',
            singleKeywords: ['单活'],
            doubleKeywords: ['双活'],
            thicknessAccessoryPacks: { '10': '10公分配件包' },
            mappings: {},
          },
        },
      }) as unknown as Response;
    }

    return createResponse(false, null) as unknown as Response;
  }) as typeof fetch;

  const loader = new ConfigLoaderService(new ApiWithStaticFallbackConfigRepository());
  await loader.loadHandleMapping();

  assert.equal(loader.getHandleMapping().defaultSupplier, '拉手供应商A');
  assert.equal(loader.getHandleMapping().thicknessAccessoryPacks['10'], '10公分配件包');
  assert.equal(loader.getHandleMapping().thicknessAccessoryPacks['7'], '7公分配件包');
  assert.equal(loader.getLoadSources().handle, 'api');
});



test('configLoader: loadAll prefers runtime snapshot when available', async () => {
  const repository: ConfigRepository & {
    readRuntimeSnapshot: () => Promise<{ payload: any; source: 'api' }>;
  } = {
    async readRuntimeSnapshot() {
      return {
        source: 'api',
        payload: {
          version: 'cfg-001',
          publishedAt: '2026-04-21T10:30:00.000Z',
          profiles: {
            material_catalog: {
              M001: { supplier: '供应商A', name: '材料A' },
            },
            formulas: {
              F001: { displayName: '配方A', bom: [] },
            },
            packaging: { supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } },
            cylinder: { dimensions: { 7: { code: '90AB', eccentricity: '34.5*55.5' } } },
            lock: { mappings: { 锁具A: { supplier: '汇成', vendorName: '6607大锁' } } },
            handle: { defaultSupplier: '拉手供应商', mappings: {} },
            lock_fork: { suppliers: { default: '应志友' } },
          },
          meta: {
            revisions: {
              material_catalog: 1,
              packaging: 2,
              cylinder: 2,
              lock: 2,
              handle: 2,
              lock_fork: 2,
              formulas: null,
            },
            degradedProfiles: [],
          },
        },
      };
    },
    async readMaterials() {
      throw new Error('readMaterials should not be called when snapshot is available');
    },
    async readFormulas() {
      throw new Error('readFormulas should not be called when snapshot is available');
    },
    async readMapping() {
      throw new Error('readMapping should not be called when snapshot is available');
    },
  };

  const loader = new ConfigLoaderService(repository);
  await loader.loadAll();

  assert.equal(loader.getMaterials().M001?.name, '材料A');
  assert.ok(loader.getFormulas().F001);
  assert.equal(loader.getPackagingMapping().mappings['包装A'], '外协包装A');
  assert.equal(loader.getLockMapping().defaultUnit, '套');
  assert.equal(loader.getLockMapping().primaryLabel, '主锁');
  assert.equal(loader.getLockMapping().secondaryLabel, '副锁');
  assert.equal(loader.getLockForkMapping().suppliers.default, '应志友');
  assert.equal(loader.getLoadSources().materials, 'api');
  assert.equal(loader.getLoadSources().packaging, 'api');
});

test('configLoader: loadAll falls back to granular reads when runtime snapshot is unavailable', async () => {
  const calls: string[] = [];
  const repository: ConfigRepository & {
    readRuntimeSnapshot: () => Promise<{ payload: any; source: 'api' }>;
  } = {
    async readRuntimeSnapshot() {
      calls.push('snapshot');
      throw new Error('snapshot unavailable');
    },
    async readMaterials() {
      calls.push('materials');
      return {
        payload: { M001: { supplier: '供应商A', name: '材料A' } },
        source: 'api',
      };
    },
    async readFormulas() {
      calls.push('formulas');
      return {
        payload: { F001: { displayName: '配方A', bom: [] } },
        source: 'api',
      };
    },
    async readMapping(kind) {
      calls.push(kind);
      const payloads: Record<string, unknown> = {
        packaging: { 包装A: '外协包装A' },
        cylinder: { dimensions: { 7: { code: '90AB', eccentricity: '34.5*55.5' } } },
        lock: { mappings: { 锁具A: { supplier: '汇成', vendorName: '6607大锁' } } },
        lockFork: { suppliers: { default: '应志友' } },
        handle: { defaultSupplier: '拉手供应商', mappings: {} },
      };
      return { payload: payloads[kind], source: 'api' };
    },
  };

  const loader = new ConfigLoaderService(repository);
  await loader.loadAll();

  assert.deepEqual(calls, ['snapshot', 'materials', 'cylinder', 'lock', 'lockFork', 'packaging', 'handle', 'formulas']);
  assert.equal(loader.getMaterials().M001?.name, '材料A');
  assert.equal(loader.getPackagingMapping().mappings['包装A'], '外协包装A');
});



test('configLoader: refreshPackagingMapping prefers runtime snapshot when available', async () => {
  const calls: string[] = [];
  const repository: ConfigRepository & {
    readRuntimeSnapshot: () => Promise<{ payload: any; source: 'api' }>;
  } = {
    async readRuntimeSnapshot() {
      calls.push('snapshot');
      return {
        source: 'api',
        payload: {
          version: 'cfg-refresh-001',
          publishedAt: '2026-04-21T11:00:00.000Z',
          profiles: {
            material_catalog: { M001: { supplier: '供应商A', name: '材料A' } },
            formulas: {},
            packaging: { supplierName: '方亮包装', mappings: { 包装B: '外协包装B' } },
            cylinder: { dimensions: { 7: { code: '90AB', eccentricity: '34.5*55.5' } } },
            lock: { mappings: {} },
            handle: { defaultSupplier: '拉手供应商', mappings: {} },
            lock_fork: { suppliers: { default: '应志友' } },
          },
          meta: { revisions: {}, degradedProfiles: [] },
        },
      };
    },
    async readMaterials() {
      throw new Error('readMaterials should not be called when snapshot refresh succeeds');
    },
    async readFormulas() {
      throw new Error('readFormulas should not be called when snapshot refresh succeeds');
    },
    async readMapping() {
      throw new Error('readMapping should not be called when snapshot refresh succeeds');
    },
  };

  const loader = new ConfigLoaderService(repository);
  await loader.refreshPackagingMapping();

  assert.deepEqual(calls, ['snapshot']);
  assert.equal(loader.getPackagingMapping().mappings['包装B'], '外协包装B');
  assert.equal(loader.getMaterials().M001?.name, '材料A');
});

test('configLoader: refreshMaterials falls back to granular read when runtime snapshot refresh is unavailable', async () => {
  const calls: string[] = [];
  const repository: ConfigRepository & {
    readRuntimeSnapshot: () => Promise<{ payload: any; source: 'api' }>;
  } = {
    async readRuntimeSnapshot() {
      calls.push('snapshot');
      throw new Error('snapshot unavailable');
    },
    async readMaterials() {
      calls.push('materials');
      return {
        payload: { M009: { supplier: '供应商Z', name: '材料Z' } },
        source: 'api',
      };
    },
    async readFormulas() {
      throw new Error('readFormulas should not be called during refreshMaterials fallback');
    },
    async readMapping() {
      throw new Error('readMapping should not be called during refreshMaterials fallback');
    },
  };

  const loader = new ConfigLoaderService(repository);
  await loader.refreshMaterials();

  assert.deepEqual(calls, ['snapshot', 'materials']);
  assert.equal(loader.getMaterials().M009?.name, '材料Z');
});

test('configLoader: source-analysis refresh and snapshot are owned by loader service', async () => {
  const calls: string[] = [];
  const repository: ConfigRepository = {
    async readMaterials() {
      calls.push('materials');
      return {
        payload: {
          M001: { supplier: '供应商A', name: '材料A' },
        },
        source: 'api',
      };
    },
    async readFormulas() {
      calls.push('formulas');
      return {
        payload: {
          F001: { displayName: '配方A', bom: [] },
        },
        source: 'api',
      };
    },
    async readMapping(kind) {
      calls.push(kind);
      const payloads: Record<string, unknown> = {
        packaging: { 包装A: '外协包装A' },
        cylinder: { dimensions: { 7: { code: '90AB', eccentricity: '34.5*55.5' } } },
        lock: { mappings: { 锁具A: { supplier: '汇成', vendorName: '6607大锁' } } },
        lockFork: { suppliers: { default: '应志友' } },
        handle: { defaultSupplier: '拉手供应商', mappings: {} },
      };
      return {
        payload: payloads[kind],
        source: 'api',
      };
    },
  };

  const loader = new ConfigLoaderService(repository);
  await loader.refreshSourceAnalysisInputs();
  const sourceConfig = loader.getSourceAnalysisConfig();

  assert.deepEqual(calls, ['materials', 'cylinder', 'lock', 'lockFork', 'packaging', 'handle', 'formulas', 'materials', 'formulas']);
  assert.ok(sourceConfig.materials.M001);
  assert.ok(sourceConfig.formulas.F001);
  assert.equal(sourceConfig.packagingMapping.mappings['包装A'], '外协包装A');
  assert.equal(sourceConfig.lockForkMapping.suppliers.default, '应志友');
});
