import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Router } from 'express';

const _require = createRequire(import.meta.url);
const tempDbPath = path.join(os.tmpdir(), `test-runtime-config-${crypto.randomBytes(8).toString('hex')}.sqlite`);

const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (
      key.includes('/server/config/database')
      || key.includes('/server/models/')
      || key.includes('/server/services/')
      || key.includes('/server/routes/runtimeConfig')
    ) {
      delete _require.cache[key];
    }
  });
};

purgeDatabaseCache();
process.env.DB_STORAGE = tempDbPath;

const runtimeConfigRoutes = (_require('../server/routes/runtimeConfig') as { default: Router }).default;
const MappingService = _require('../server/services/mappings') as typeof import('../server/services/mappings');
const MaterialCatalogService = _require('../server/services/materials') as typeof import('../server/services/materials');
const FormulaService = _require('../server/services/formulas') as typeof import('../server/services/formulas');
const { initDB, sequelize, Material } = _require('../server/models') as typeof import('../server/models');

let server: ReturnType<ReturnType<typeof express>['listen']>;
let baseUrl: string;

async function seedPublishedMapping(profileCode: 'packaging' | 'handle' | 'lock' | 'cylinder' | 'lock_fork', payload: Record<string, unknown>) {
  const detail = await MappingService.getMappingDetail(profileCode);
  const currentRevision = detail && detail.ok
    ? detail.mapping.latestRevision?.revision ?? 0
    : 0;
  const draft = await MappingService.updateDraft(profileCode, {
    revision: currentRevision,
    payload,
    changeNote: 'runtime snapshot seed',
    operator: 'test-user',
  });
  assert.equal(draft.ok, true);
  const published = await MappingService.publish(profileCode, {
    fromRevision: draft.revision.revision,
    changeNote: 'runtime snapshot publish',
    operator: 'test-user',
  });
  assert.equal(published.ok, true);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/runtime', runtimeConfigRoutes);

  return await new Promise<{ server: typeof server; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = (s.address() as { port: number });
      resolve({ server: s, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

test.before(async () => {
  await initDB();
  await Material.create({
    code: 'M001',
    name: '材料A',
    supplier: '供应商A',
    unit: '个',
    category: 'Raw',
  });
  await MaterialCatalogService.saveAndPublishLegacyCompatible({
    M001: {
      supplier: '供应商A',
      name: '材料A',
      unit: '个',
    },
  }, { headers: { 'x-operator': 'test-user' } });

  await seedPublishedMapping('packaging', {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });
  await seedPublishedMapping('cylinder', {
    dimensions: { 7: { code: '90AB', eccentricity: '34.5*55.5' } },
    mappings: { 锁芯A: { supplier: '忠恒', template: '{code}锁芯A' } },
  });
  await seedPublishedMapping('lock', {
    defaultUnit: '套',
    primaryLabel: '主锁',
    secondaryLabel: '副锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '汇成',
        vendorName: '6607大锁',
        primarySpec: '主锁体',
      },
    },
  });
  await seedPublishedMapping('handle', {
    defaultSupplier: '拉手供应商A',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手(待人工处理)',
    singleKeywords: ['单活'],
    doubleKeywords: ['双活'],
    thicknessAccessoryPacks: { '10': '10公分配件包' },
    mappings: {},
  });
  await seedPublishedMapping('lock_fork', {
    baseDimensions: {
      7: {
        standard: {
          upper: { base1: 570, base2: 301 },
          lower: { base1: 570, base2: 301 },
        },
      },
    },
    suppliers: { default: '应志友' },
  });

  const created = await FormulaService.createFormula({
    displayName: '测试配方',
    bom: [{ materialId: 'M001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 2, paired: 2 } }],
    changeNote: 'runtime snapshot seed',
    operator: 'test-user',
  });
  assert.equal(created.ok, true);
  const createdRevision = typeof created.revision === 'number'
    ? created.revision
    : created.revision?.revision;
  const publishResult = await FormulaService.publish(String(created.definition?.formula_key || ''), {
    fromRevision: createdRevision,
    changeNote: 'runtime snapshot publish',
    operator: 'test-user',
  });
  assert.equal(publishResult.ok, true);

  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test.after(async () => {
  if (!server) {
    await sequelize.close();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  await sequelize.close();
});

test('GET /api/runtime/config-snapshot returns a unified published runtime snapshot', async () => {
  const res = await fetch(`${baseUrl}/api/runtime/config-snapshot`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(typeof body.version, 'string');
  assert.ok(body.version.length > 0);
  assert.equal(typeof body.publishedAt, 'string');
  assert.equal(body.profiles.material_catalog.M001.name, '材料A');
  assert.equal(body.profiles.packaging.mappings['包装A'], '外协包装A');
  assert.equal(body.profiles.cylinder.dimensions['7'].code, '90AB');
  assert.equal(body.profiles.lock.primaryLabel, '主锁');
  assert.equal(body.profiles.handle.defaultSupplier, '拉手供应商A');
  assert.equal(body.profiles.lock_fork.suppliers.default, '应志友');
  assert.equal(typeof body.profiles.formulas, 'object');
  assert.ok(Object.keys(body.profiles.formulas).length > 0);
  assert.equal(typeof body.meta.revisions.material_catalog, 'number');
  assert.ok(body.meta.revisions.material_catalog >= 1);
  assert.equal(body.meta.revisions.packaging, 2);
  assert.deepEqual(body.meta.degradedProfiles, []);
});
