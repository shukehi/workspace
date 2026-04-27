import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import type { Router } from 'express';

const _require = createRequire(import.meta.url);
const tempDbPath = path.join(os.tmpdir(), `test-config-profile-routes-${crypto.randomBytes(8).toString('hex')}.sqlite`);

const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/') || key.includes('/server/services/') || key.includes('/server/routes/configProfiles')) {
      delete _require.cache[key];
    }
  });
};

purgeDatabaseCache();
process.env.DB_STORAGE = tempDbPath;

const configProfilesRoutes = (_require('../server/routes/configProfiles') as { default: Router }).default;
const configMastersRoutes = (_require('../server/routes/configMasters') as { default: Router }).default;
const MappingService = _require('../server/services/mappings') as typeof import('../server/services/mappings');
const MaterialCatalogService = _require('../server/services/materials') as typeof import('../server/services/materials');
const FormulaService = _require('../server/services/formulas') as typeof import('../server/services/formulas');
const { initDB, sequelize, Material, ErpContract, SupplierMaster } = _require('../server/models') as typeof import('../server/models');

let server: ReturnType<ReturnType<typeof express>['listen']>;
let baseUrl: string;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/config/profiles', configProfilesRoutes);
  app.use('/api/config/masters', configMastersRoutes);

  return await new Promise<{ server: typeof server; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = (s.address() as { port: number });
      resolve({ server: s, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function seedPublishedMapping(profileCode: 'packaging' | 'lock' | 'cylinder' | 'handle' | 'lock_fork', payload: Record<string, unknown>) {
  const detail = await MappingService.getMappingDetail(profileCode);
  const currentRevision = detail && detail.ok ? detail.mapping.latestRevision?.revision ?? 0 : 0;
  const draft = await MappingService.updateDraft(profileCode, {
    revision: currentRevision,
    payload,
    changeNote: 'profile bridge seed',
    operator: 'test-user',
  });
  assert.equal(draft.ok, true);
  const published = await MappingService.publish(profileCode, {
    fromRevision: draft.revision.revision,
    changeNote: 'profile bridge publish',
    operator: 'test-user',
  });
  assert.equal(published.ok, true);
}

test.before(async () => {
  await initDB();
  await Material.create({ code: 'M001', name: '材料A', supplier: '供应商A', unit: '个', category: 'Raw' });

  await MaterialCatalogService.saveAndPublishLegacyCompatible({
    M001: { supplier: '供应商A', name: '材料A', unit: '个' },
  }, { headers: { 'x-operator': 'test-user' } });

  await seedPublishedMapping('packaging', {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  });

  const created = await FormulaService.createFormula({
    displayName: '测试配方',
    bom: [{ materialId: 'M001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 2, paired: 2 } }],
    changeNote: 'profile bridge seed',
    operator: 'test-user',
  });
  assert.equal(created.ok, true);
  const createdRevision = typeof created.revision === 'number' ? created.revision : created.revision?.revision;
  const publishResult = await FormulaService.publish(String(created.definition?.formula_key || ''), {
    fromRevision: createdRevision,
    changeNote: 'profile bridge publish',
    operator: 'test-user',
  });
  assert.equal(publishResult.ok, true);

  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  await sequelize.close();
});

test('GET /api/config/profiles returns normalized profile summaries', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.items));

  const packaging = body.items.find((item: any) => item.code === 'packaging');
  const materials = body.items.find((item: any) => item.code === 'material_catalog');
  const formulas = body.items.find((item: any) => item.code === 'formulas');
  const suppliers = body.items.find((item: any) => item.code === 'supplier_master');

  assert.equal(packaging.domain, 'mapping');
  assert.equal(packaging.capabilities.publish, true);
  assert.equal(materials.domain, 'catalog');
  assert.equal(formulas.workflowKind, 'collection');
  assert.equal(formulas.capabilities.publish, false);
  assert.equal(suppliers.workflowKind, 'collection');
});

test('GET /api/config/profiles/packaging/detail returns normalized singleton detail', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.detail.profile.code, 'packaging');
  assert.equal(body.detail.profile.workflowKind, 'singleton');
  assert.equal(typeof body.detail.publishedPayload.supplierName, 'string');
  assert.equal(typeof body.detail.publishedPayload.mappings, 'object');
  assert.equal(Array.isArray(body.detail.publishedPayload.mappings), false);
  assert.equal(body.detail.publishedPayload.supplierName, '方亮包装');
  assert.equal(body.detail.publishedPayload.mappings['包装A'], '外协包装A');
  assert.equal(typeof body.detail.publishedRevision.revision, 'number');
});

test('GET /api/config/profiles/packaging/diff returns draft-vs-published diff items', async () => {
  const detailRes = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  const detailBody = await detailRes.json();
  const revision = detailBody.detail.latestRevision.revision;

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/packaging/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision,
      payload: { supplierName: '方亮包装', mappings: { 包装A: '外协包装A-修改', 包装B: '新增包装' } },
      changeNote: 'diff draft',
    }),
  });
  assert.equal(draftRes.status, 200);

  const diffRes = await fetch(`${baseUrl}/api/config/profiles/packaging/diff`);
  assert.equal(diffRes.status, 200);
  const diffBody = await diffRes.json();
  assert.equal(diffBody.success, true);
  assert.equal(diffBody.diff.profileCode, 'packaging');
  assert.equal(diffBody.diff.hasChanges, true);
  assert.ok(Array.isArray(diffBody.diff.items));
  assert.ok(diffBody.diff.items.some((item: any) => item.path === 'mappings.包装A' && item.kind === 'changed'));
  assert.ok(diffBody.diff.items.some((item: any) => item.path === 'mappings.包装B' && item.kind === 'added'));
});

test('GET /api/config/profiles/packaging/replay returns fixture-backed replay summary', async () => {
  const detailRes = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  const detailBody = await detailRes.json();
  const revision = detailBody.detail.latestRevision.revision;

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/packaging/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision,
      payload: { supplierName: '方亮包装', mappings: { 包装A: '测试回放包装A', 包装B: '测试回放包装B' } },
      changeNote: 'replay draft',
    }),
  });
  assert.equal(draftRes.status, 200);

  const replayRes = await fetch(`${baseUrl}/api/config/profiles/packaging/replay`);
  assert.equal(replayRes.status, 200);
  const replayBody = await replayRes.json();
  assert.equal(replayBody.success, true);
  assert.equal(replayBody.replay.profileCode, 'packaging');
  assert.equal(replayBody.replay.sampleSource, 'fixtures');
  assert.ok(replayBody.replay.sampleCount > 0);
  assert.ok(Array.isArray(replayBody.replay.items));
});

test('GET /api/config/profiles/packaging/replay prefers recent contract cache samples when available', async () => {
  await ErpContract.create({
    contract_code: 'REPLAY-CACHED-001',
    customer_name: '测试客户',
    payload_hash: 'hash-1',
    last_fetched_at: new Date().toISOString(),
    raw_json: {
      code: 'REPLAY-CACHED-001',
      customerName: '测试客户',
      remark: '',
      list: [
        {
          spec: '960*2050/7/外开外包',
          mb: 'T型现代边',
          mshd: '10',
          sx: 'ZH-微珠锌合金MAN',
          color: '雅琴色',
          bz: '罗曼蒂克',
          productModelName: '雅琴',
          qty: '2/1',
        },
      ],
    },
  });

  const replayRes = await fetch(`${baseUrl}/api/config/profiles/packaging/replay`);
  assert.equal(replayRes.status, 200);
  const replayBody = await replayRes.json();
  assert.equal(replayBody.success, true);
  assert.equal(replayBody.replay.sampleSource, 'contract-cache');
  assert.ok(replayBody.replay.sampleCount >= 1);
});

test('PUT/POST profile draft+publish bridge works for packaging', async () => {
  const detailRes = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  const detailBody = await detailRes.json();
  const revision = detailBody.detail.latestRevision.revision;

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/packaging/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision,
      payload: { supplierName: '新包装供应商', mappings: { 包装B: '外协包装B' } },
      changeNote: 'bridge draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);
  assert.equal(typeof draftBody.revision.revision, 'number');

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/packaging/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ fromRevision: draftBody.revision.revision, changeNote: 'bridge publish' }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);

  const refreshedRes = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  const refreshedBody = await refreshedRes.json();
  assert.equal(refreshedBody.detail.publishedPayload.supplierName, '新包装供应商');
  assert.equal(refreshedBody.detail.publishedPayload.mappings['包装B'], '外协包装B');

  const revisionsRes = await fetch(`${baseUrl}/api/config/profiles/packaging/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.equal(revisionsBody.success, true);
  assert.ok(Array.isArray(revisionsBody.items));

  const auditRes = await fetch(`${baseUrl}/api/config/profiles/packaging/audit-logs`);
  assert.equal(auditRes.status, 200);
  const auditBody = await auditRes.json();
  assert.equal(auditBody.success, true);
  assert.ok(Array.isArray(auditBody.items));
});

test('packaging profile reports unsupported/missing/conflict/validation workflow errors through unified routes', async () => {
  const missingDetailRes = await fetch(`${baseUrl}/api/config/profiles/cylinder/detail`);
  assert.equal(missingDetailRes.status, 404);

  const invalidTypeRes = await fetch(`${baseUrl}/api/config/profiles/not-supported/detail`);
  assert.equal(invalidTypeRes.status, 404);
  const invalidTypeBody = await invalidTypeRes.json();
  assert.equal(invalidTypeBody.success, false);
  assert.ok(invalidTypeBody.error || invalidTypeBody.errors);

  const invalidPayloadRes = await fetch(`${baseUrl}/api/config/profiles/lock_fork/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      payload: null,
    }),
  });
  assert.equal(invalidPayloadRes.status, 422);
  const invalidPayloadBody = await invalidPayloadRes.json();
  assert.equal(invalidPayloadBody.success, false);
  assert.equal(Array.isArray(invalidPayloadBody.errors), true);

  const detailRes = await fetch(`${baseUrl}/api/config/profiles/packaging/detail`);
  const detailBody = await detailRes.json();
  const staleRevision = (detailBody.detail?.latestRevision?.revision ?? 0) - 1;

  const conflictRes = await fetch(`${baseUrl}/api/config/profiles/packaging/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      revision: staleRevision,
      payload: {
        supplierName: '方亮包装',
        mappings: {
          包装A: '外协包装A',
        },
      },
      changeNote: 'stale update',
    }),
  });
  assert.equal(conflictRes.status, 409);
  const conflictBody = await conflictRes.json();
  assert.equal(conflictBody.success, false);
  assert.equal(conflictBody.errors[0].code, 'revision-conflict');

  const missingPublishRes = await fetch(`${baseUrl}/api/config/profiles/cylinder/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      fromRevision: 1,
    }),
  });
  assert.equal(missingPublishRes.status, 404);
});

test('lock profile draft/publish/detail workflow works through unified profile routes', async () => {
  const initialDetailRes = await fetch(`${baseUrl}/api/config/profiles/lock/detail`);
  const initialDetailBody = await initialDetailRes.json();
  const currentRevision = initialDetailBody.detail?.latestRevision?.revision ?? 0;

  const nextPayload = {
    defaultUnit: '套',
    primaryLabel: '主锁',
    secondaryLabel: '副锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '统一锁具供应商',
        vendorName: '统一锁具外协名',
        primarySpec: '主锁体',
      },
    },
  };

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/lock/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: currentRevision,
      payload: nextPayload,
      changeNote: 'unified lock draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/lock/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: draftBody.revision.revision,
      changeNote: 'unified lock publish',
    }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);

  const detailRes = await fetch(`${baseUrl}/api/config/profiles/lock/detail`);
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.equal(detailBody.success, true);
  assert.deepEqual(detailBody.detail.publishedPayload, nextPayload);
  assert.equal(detailBody.detail.publishedRevision.revision, publishBody.revision.revision);
});

test('handle profile draft/publish/detail workflow works through unified profile routes', async () => {
  const initialDetailRes = await fetch(`${baseUrl}/api/config/profiles/handle/detail`);
  const initialDetailBody = await initialDetailRes.json();
  const currentRevision = initialDetailBody.detail?.latestRevision?.revision ?? 0;

  const nextPayload = {
    defaultSupplier: '统一拉手供应商',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手(待人工处理)',
    mappings: {
      拉手新版: {
        supplier: '统一拉手供应商',
        vendorName: '统一拉手外协名',
        materialCode: 'HANDLE-UNIFIED-001',
      },
    },
  };

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/handle/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: currentRevision,
      payload: nextPayload,
      changeNote: 'unified handle draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/handle/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: draftBody.revision.revision,
      changeNote: 'unified handle publish',
    }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);

  const detailRes = await fetch(`${baseUrl}/api/config/profiles/handle/detail`);
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.equal(detailBody.success, true);
  assert.deepEqual(detailBody.detail.publishedPayload, nextPayload);
  assert.equal(detailBody.detail.publishedRevision.revision, publishBody.revision.revision);
});

test('GET /api/config/profiles/material_catalog/detail returns normalized catalog detail', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/material_catalog/detail`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.detail.profile.code, 'material_catalog');
  assert.equal(body.detail.profile.domain, 'catalog');
  assert.equal(typeof body.detail.publishedPayload, 'object');
  assert.equal(Array.isArray(body.detail.publishedPayload), false);
  assert.equal(typeof body.detail.publishedPayload.M001.supplier, 'string');
  assert.equal(typeof body.detail.publishedPayload.M001.unit, 'string');
  assert.equal(body.detail.publishedPayload.M001.name, '材料A');
});

test('material_catalog profile draft/publish/revisions/audit-logs work through unified workflow routes', async () => {
  const currentDetailRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/detail`);
  assert.equal(currentDetailRes.status, 200);
  const currentDetailBody = await currentDetailRes.json();
  const currentRevision = currentDetailBody.detail.latestRevision.revision;

  const draftPayload = {
    M001: {
      supplier: '供应商A-更新',
      name: '材料A-更新',
      unit: 'pcs',
    },
    M002: {
      supplier: '供应商B',
      name: '材料B',
      unit: 'kg',
    },
  };

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: currentRevision,
      payload: draftPayload,
      changeNote: 'unified material-catalog draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);
  assert.ok(draftBody.revision.revision > currentRevision);

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: draftBody.revision.revision,
      changeNote: 'unified material-catalog publish',
    }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);
  assert.ok(publishBody.revision.revision > draftBody.revision.revision);

  const refreshedRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/detail`);
  assert.equal(refreshedRes.status, 200);
  const refreshedBody = await refreshedRes.json();
  assert.deepEqual(refreshedBody.detail.publishedPayload, draftPayload);

  const revisionsRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.equal(revisionsBody.success, true);
  assert.ok(Array.isArray(revisionsBody.items));
  assert.ok(revisionsBody.items.some((item: any) => item.revision === publishBody.revision.revision && item.state === 'published'));

  const auditLogsRes = await fetch(`${baseUrl}/api/config/profiles/material_catalog/audit-logs`);
  assert.equal(auditLogsRes.status, 200);
  const auditLogsBody = await auditLogsRes.json();
  assert.equal(auditLogsBody.success, true);
  assert.ok(Array.isArray(auditLogsBody.items));
  assert.ok(auditLogsBody.items.some((item: any) => item.action === 'publish'));
});

test('GET /api/config/profiles/supplier_master/detail returns unified supplier master collection detail', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/supplier_master/detail`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.detail.profile.code, 'supplier_master');
  assert.equal(body.detail.profile.workflowKind, 'collection');
  assert.equal(typeof body.detail.collection.total, 'number');
  assert.ok(Array.isArray(body.detail.collection.previewItems));
});

test('GET /api/config/masters/suppliers returns aggregated supplier master entries', async () => {
  const res = await fetch(`${baseUrl}/api/config/masters/suppliers`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.items));
  assert.ok(body.items.some((item: any) => item.supplierName === '供应商A'));
  assert.ok(body.items.every((item: any) => Array.isArray(item.sources)));
  assert.ok(body.items.every((item: any) => typeof item.persisted === 'boolean'));
  assert.ok(body.items.every((item: any) => typeof item.linkedMaterialCount === 'number'));
  assert.ok(body.items.every((item: any) => typeof item.hasLinkedMaterialsWhileInactive === 'boolean'));
});

test('GET /api/config/masters/materials and detail expose lower-level material master domain surface', async () => {
  const listRes = await fetch(`${baseUrl}/api/config/masters/materials`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.success, true);
  assert.ok(Array.isArray(listBody.items));

  const detailRes = await fetch(`${baseUrl}/api/config/masters/materials/detail`);
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.equal(detailBody.success, true);
  assert.equal(detailBody.detail.profile.code, 'material_master');
  assert.ok(Array.isArray(detailBody.detail.items));
});

test('GET /api/config/masters/suppliers/detail seeds and reads persisted supplier master detail', async () => {
  await SupplierMaster.destroy({ where: {} });
  const res = await fetch(`${baseUrl}/api/config/masters/suppliers/detail`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.detail.profile.code, 'supplier_master');
  assert.equal(typeof body.detail.total, 'number');
  assert.ok(Array.isArray(body.detail.items));
  assert.ok(body.detail.items.some((item: any) => item.supplierName === '供应商A'));

  const persistedCount = await SupplierMaster.count();
  assert.ok(persistedCount > 0);
});

test('POST/PUT/archive supplier master items works through masters route', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplierName: '新供应商X',
      sourceNote: 'manual-create',
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.equal(createBody.success, true);
  assert.equal(createBody.item.supplierName, '新供应商X');

  const updateRes = await fetch(`${baseUrl}/api/config/masters/suppliers/${createBody.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplierName: '新供应商X-更新',
      sourceNote: 'manual-update',
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.success, true);
  assert.equal(updateBody.item.supplierName, '新供应商X-更新');

  const archiveRes = await fetch(`${baseUrl}/api/config/masters/suppliers/${createBody.item.id}/archive`, {
    method: 'POST',
  });
  assert.equal(archiveRes.status, 200);
  const archiveBody = await archiveRes.json();
  assert.equal(archiveBody.success, true);
  assert.equal(archiveBody.item.status, 'inactive');

  const auditRes = await fetch(`${baseUrl}/api/config/masters/suppliers/audit-logs`);
  assert.equal(auditRes.status, 200);
  const auditBody = await auditRes.json();
  assert.equal(auditBody.success, true);
  assert.ok(Array.isArray(auditBody.items));
  assert.ok(auditBody.items.some((item: any) => item.action === 'create'));
  assert.ok(auditBody.items.some((item: any) => item.action === 'archive'));

  const profileAuditRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/audit-logs`);
  assert.equal(profileAuditRes.status, 200);
  const profileAuditBody = await profileAuditRes.json();
  assert.equal(profileAuditBody.success, true);
  assert.ok(Array.isArray(profileAuditBody.items));
});

test('material master item bridge best-effort links material to supplier master by supplier name', async () => {
  const supplierRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName: '链接供应商Y' }),
  });
  assert.equal(supplierRes.status, 201);

  const createRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'MAT-LINK-001',
      name: '链接物料',
      supplier: '链接供应商Y',
      unit: '个',
      price: 1,
      category: '测试',
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.equal(createBody.success, true);
  assert.ok(Number.isInteger(createBody.item.supplier_master_id));
  assert.ok(createBody.item.supplier_master_id > 0);

  const updateRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items/${createBody.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplier: '不存在的供应商ZZ',
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.success, true);
  assert.equal(updateBody.item.supplier_master_id, null);
});

test('material master item bridge accepts explicit supplier_master_id override', async () => {
  const supplierRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName: '手动指定供应商Q' }),
  });
  assert.equal(supplierRes.status, 201);
  const supplierBody = await supplierRes.json();

  const createRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'MAT-MANUAL-LINK-001',
      name: '手动链接物料',
      supplier: '不会匹配的供应商',
      supplier_master_id: supplierBody.item.id,
      unit: '个',
      price: 1,
      category: '测试',
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.equal(createBody.success, true);
  assert.equal(createBody.item.supplier_master_id, supplierBody.item.id);
});

test('material master update treats null supplier_master_id as auto-match when supplier can be resolved', async () => {
  const supplierRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName: '自动重连供应商' }),
  });
  assert.equal(supplierRes.status, 201);
  const supplierBody = await supplierRes.json();

  const createRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'MAT-AUTO-RELINK-001',
      name: '自动重连物料',
      supplier: '不会命中的供应商',
      unit: '个',
      price: 1,
      category: '测试',
    }),
  });
  assert.equal(createRes.status, 201);
  const createBody = await createRes.json();
  assert.equal(createBody.item.supplier_master_id, null);

  const updateRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items/${createBody.item.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplier: '自动重连供应商',
      supplier_master_id: null,
    }),
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.success, true);
  assert.equal(updateBody.item.supplier_master_id, supplierBody.item.id);
});

test('GET /api/config/profiles/supplier_master/items/:id/materials returns linked material drill-down', async () => {
  const supplierRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName: '关联明细供应商' }),
  });
  assert.equal(supplierRes.status, 201);
  const supplierBody = await supplierRes.json();

  const materialRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'MAT-SUPPLIER-DETAIL-001',
      name: '关联明细物料',
      supplier: '关联明细供应商',
      supplier_master_id: supplierBody.item.id,
      unit: '个',
      price: 1,
      category: '测试',
    }),
  });
  assert.equal(materialRes.status, 201);

  const linkedRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/items/${supplierBody.item.id}/materials`);
  assert.equal(linkedRes.status, 200);
  const linkedBody = await linkedRes.json();
  assert.equal(linkedBody.success, true);
  assert.ok(Array.isArray(linkedBody.items));
  assert.ok(linkedBody.items.some((item: any) => item.code === 'MAT-SUPPLIER-DETAIL-001'));
  assert.equal(linkedBody.total, linkedBody.items.length);
});

test('GET /api/config/profiles/handle/reference-check reports material and supplier reference gaps', async () => {
  const detailRes = await fetch(`${baseUrl}/api/config/profiles/handle/detail`);
  const detailBody = await detailRes.json();
  const currentRevision = detailBody.detail?.latestRevision?.revision ?? 0;

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/handle/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: currentRevision,
      payload: {
        defaultSupplier: '不存在的供应商',
        unmatchedSupplier: '待人工处理',
        manualReviewLabel: '未匹配拉手(待人工处理)',
        singleKeywords: ['单活'],
        doubleKeywords: ['双活'],
        thicknessAccessoryPacks: { '10': '10公分配件包' },
        mappings: {
          样例拉手: {
            supplier: '不存在的供应商',
            vendorName: '样例外协名',
            materialCode: 'UNKNOWN-MATERIAL-CODE'
          }
        }
      },
      changeNote: 'reference-check draft',
    }),
  });
  assert.equal(draftRes.status, 200);

  const res = await fetch(`${baseUrl}/api/config/profiles/handle/reference-check`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.check.profileCode, 'handle');
  assert.ok(Array.isArray(body.check.supplierRefs));
  assert.ok(Array.isArray(body.check.materialCodeRefs));
  assert.ok(body.check.missingMaterialCodes.includes('UNKNOWN-MATERIAL-CODE'));
  assert.ok(body.check.suppliersMissingInMaterialMaster.includes('不存在的供应商'));
  assert.equal(body.check.hasIssues, true);
});

test('GET /api/config/profiles/packaging/reference-check only reports packaging supplier refs', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/packaging/reference-check`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.check.profileCode, 'packaging');
  assert.ok(body.check.supplierRefs.includes('新包装供应商') || body.check.supplierRefs.includes('方亮包装'));
  assert.deepEqual(body.check.materialCodeRefs, []);
});

test('GET /api/config/profiles/formulas/reference-check extracts formula BOM supplier/material refs', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/reference-check`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.check.profileCode, 'formulas');
  assert.ok(Array.isArray(body.check.supplierRefs));
  assert.ok(Array.isArray(body.check.materialCodeRefs));
  assert.ok(body.check.materialCodeRefs.includes('M001'));
  assert.ok(body.check.supplierRefs.includes('供应商A'));
});

test('GET /api/config/profiles/material_master/reference-check extracts material collection supplier/material refs', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/material_master/reference-check`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.check.profileCode, 'material_master');
  assert.ok(Array.isArray(body.check.materialCodeRefs));
  assert.ok(Array.isArray(body.check.supplierRefs));
  assert.ok(body.check.materialCodeRefs.length > 0);
   assert.equal(typeof body.check.unlinkedMaterialCount, 'number');
});

test('GET /api/config/profiles/supplier_master/reference-check reports inactive linked supplier health', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/masters/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName: '健康检查供应商', status: 'active' }),
  });
  const createBody = await createRes.json();

  await fetch(`${baseUrl}/api/config/profiles/material_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: 'MAT-HEALTH-001',
      name: '健康检查物料',
      supplier: '健康检查供应商',
      supplier_master_id: createBody.item.id,
      unit: '个',
      price: 1,
      category: '测试',
    }),
  });

  await fetch(`${baseUrl}/api/config/masters/suppliers/${createBody.item.id}/archive`, { method: 'POST' });

  const res = await fetch(`${baseUrl}/api/config/profiles/supplier_master/reference-check`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.check.profileCode, 'supplier_master');
  assert.equal(typeof body.check.inactiveLinkedSupplierCount, 'number');
  assert.ok(body.check.inactiveLinkedSupplierCount >= 1);
});

test('GET /api/config/profiles/formulas/detail returns collection-style read-only detail', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/detail`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.detail.profile.code, 'formulas');
  assert.equal(body.detail.profile.workflowKind, 'collection');
  assert.equal(body.detail.profile.capabilities.publish, false);
  assert.equal(typeof body.detail.collection.total, 'number');
  assert.equal(typeof body.detail.publishedPayload, 'object');
});

test('formulas profile rejects singleton draft workflow actions with 405 bridge response', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ revision: 1, payload: {} }),
  });
  assert.equal(res.status, 405);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(body.errors[0].code, 'unsupported');
});

test('formulas profile returns collection diff summary', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/diff`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.diff.profileCode, 'formulas');
  assert.equal(typeof body.diff.hasChanges, 'boolean');
});

test('formulas profile returns collection impact summary', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/impact`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.impact.profileCode, 'formulas');
  assert.equal(typeof body.impact.totalChanges, 'number');
});

test('formulas profile returns collection replay summary', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/replay`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.replay.profileCode, 'formulas');
  assert.equal(typeof body.replay.sampleCount, 'number');
});

test('formula profile item bridge supports list/detail/draft/publish/revisions', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      displayName: '桥接配方',
      bom: [{ materialId: 'M001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 1, paired: 2 } }],
      changeNote: 'bridge create',
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  const formulaKey = created.formula.formulaKey;

  const listRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items?page=1&pageSize=20`);
  assert.equal(listRes.status, 200);
  const listBody = await listRes.json();
  assert.equal(listBody.success, true);
  assert.ok(Array.isArray(listBody.items));
  assert.equal(typeof listBody.total, 'number');
  assert.equal(typeof listBody.page, 'number');
  assert.equal(typeof listBody.pageSize, 'number');
  assert.ok(listBody.items.some((item: any) => item.formulaKey === formulaKey));

  const detailRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}`);
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.equal(detailBody.success, true);
  assert.equal(detailBody.formula.formulaKey, formulaKey);

  const draftRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: created.revision.revision,
      formulaKey,
      displayName: '桥接配方-更新',
      bom: [{ materialId: 'M001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1.5, double: 1, paired: 2 } }],
      changeNote: 'bridge draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: draftBody.revision.revision,
      changeNote: 'bridge publish',
    }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);

  const revisionsRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.equal(revisionsBody.success, true);
  assert.ok(Array.isArray(revisionsBody.items));
  assert.ok(revisionsBody.items.length >= 2);

  const archiveRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      reason: 'bridge archive',
    }),
  });
  assert.equal(archiveRes.status, 200);
  const archiveBody = await archiveRes.json();
  assert.equal(archiveBody.success, true);

  const archivedDetailRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}`);
  assert.equal(archivedDetailRes.status, 200);
  const archivedDetailBody = await archivedDetailRes.json();
  assert.equal(archivedDetailBody.success, true);
  assert.equal(archivedDetailBody.formula.status, 'archived');
});

test('formula profile item bridge canonicalizes supplier + model split to material code', async () => {
  await Material.create({
    code: '华荣8181',
    name: '华荣8181',
    supplier: '华荣',
    model: '8181',
    unit: 'kg',
    category: 'Raw',
  });

  const createRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      displayName: '统一桥接供应商型号拆分校验',
      bom: [{ materialId: '8181', position: 'main', materialCategory: '塑粉', supplier: '华荣', usage: { single: 1, double: 1, paired: 2 } }],
      changeNote: 'unified supplier/model split',
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  const formulaKey = created.formula.formulaKey;

  const detailRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}`);
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.success, true);
  assert.equal(detail.formula.bom[0].materialId, '华荣8181');
});

test('GET /api/config/profiles/formulas/bom-recommendations returns read-only draft candidates', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      displayName: '推荐源桥接配方',
      bom: [{ materialId: 'M001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 2, paired: 3 } }],
      changeNote: 'recommend source create',
    }),
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  const formulaKey = created.formula.formulaKey;

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/formulas/items/${encodeURIComponent(formulaKey)}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: created.revision.revision,
      changeNote: 'recommend source publish',
    }),
  });
  assert.equal(publishRes.status, 200);

  const beforeRevisions = await FormulaService.listRevisions(formulaKey);
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/bom-recommendations?sourceFormulaKey=${encodeURIComponent(formulaKey)}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  const afterRevisions = await FormulaService.listRevisions(formulaKey);

  assert.equal(body.success, true);
  assert.equal(body.recommendation.readOnly, true);
  assert.equal(body.recommendation.sideEffect, 'none');
  assert.equal(body.recommendation.source.type, 'published_formula');
  assert.equal(body.recommendation.source.formulaKey, formulaKey);
  assert.equal(body.recommendation.rows[0].materialId, 'M001');
  assert.equal(body.recommendation.rows[0].usage.paired, 3);
  assert.equal(afterRevisions?.length, beforeRevisions?.length);
});

test('GET /api/config/profiles/formulas/bom-recommendations degrades safely without a source', async () => {
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/bom-recommendations`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.recommendation.readOnly, true);
  assert.equal(body.recommendation.sideEffect, 'none');
  assert.equal(body.recommendation.source.type, 'none');
  assert.equal(body.recommendation.confidence, 0);
  assert.deepEqual(body.recommendation.rows, []);
  assert.ok(body.recommendation.warnings.some((warning: any) => warning.code === 'NO_SOURCE'));
});

test('GET /api/config/profiles/formulas/bom-recommendations rejects overlong source keys', async () => {
  const overlongKey = 'F'.repeat(129);
  const res = await fetch(`${baseUrl}/api/config/profiles/formulas/bom-recommendations?sourceFormulaKey=${overlongKey}`);
  assert.equal(res.status, 400);

  const body = await res.json();
  assert.equal(body.success, false);
  assert.match(body.error, /sourceFormulaKey/i);
});

test('supplier master profile lifecycle seeds, publishes, and rolls back revisions', async () => {
  const initialDetailRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/detail`);
  assert.equal(initialDetailRes.status, 200);
  const initialDetailBody = await initialDetailRes.json();
  assert.equal(initialDetailBody.detail.profile.code, 'supplier_master');
  assert.equal(typeof initialDetailBody.detail.publishedRevision.revision, 'number');

  const createRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ supplierName: '生命周期供应商', status: 'active' }),
  });
  assert.equal(createRes.status, 201);

  const detailAfterCreateRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/detail`);
  const detailAfterCreateBody = await detailAfterCreateRes.json();
  const supplierDraftRevision = detailAfterCreateBody.detail.draftRevision.revision;
  assert.ok(Number(supplierDraftRevision) > Number(detailAfterCreateBody.detail.publishedRevision.revision));

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ fromRevision: supplierDraftRevision, changeNote: 'publish supplier lifecycle' }),
  });
  assert.equal(publishRes.status, 200);

  const revisionsRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.ok(Array.isArray(revisionsBody.items));
  assert.ok(revisionsBody.items.some((item: any) => item.state === 'published'));

  const publishedRevision = revisionsBody.items.find((item: any) => item.state === 'published');
  const rollbackRes = await fetch(`${baseUrl}/api/config/profiles/supplier_master/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ targetRevision: publishedRevision.revision, reason: 'supplier rollback test' }),
  });
  assert.equal(rollbackRes.status, 200);
});

test('material master profile lifecycle publishes current draft snapshot and lists revisions', async () => {
  const initialDetailRes = await fetch(`${baseUrl}/api/config/profiles/material_master/detail`);
  assert.equal(initialDetailRes.status, 200);
  const initialDetailBody = await initialDetailRes.json();
  assert.equal(initialDetailBody.detail.profile.code, 'material_master');
  assert.equal(typeof initialDetailBody.detail.publishedRevision.revision, 'number');

  const updateRes = await fetch(`${baseUrl}/api/config/profiles/material_master/items/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ name: '材料A-修订版' }),
  });
  assert.equal(updateRes.status, 200);

  const detailAfterUpdateRes = await fetch(`${baseUrl}/api/config/profiles/material_master/detail`);
  const detailAfterUpdateBody = await detailAfterUpdateRes.json();
  const materialDraftRevision = detailAfterUpdateBody.detail.draftRevision.revision;
  assert.ok(Number(materialDraftRevision) > Number(detailAfterUpdateBody.detail.publishedRevision.revision));

  const publishRes = await fetch(`${baseUrl}/api/config/profiles/material_master/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({ fromRevision: materialDraftRevision, changeNote: 'publish material lifecycle' }),
  });
  assert.equal(publishRes.status, 200);

  const revisionsRes = await fetch(`${baseUrl}/api/config/profiles/material_master/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.ok(Array.isArray(revisionsBody.items));
  assert.ok(revisionsBody.items.some((item: any) => item.state === 'published'));
});
