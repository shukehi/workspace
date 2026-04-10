import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'
import type { Router } from 'express'

const _require = createRequire(import.meta.url);
const tempDbPath = path.join(os.tmpdir(), `test-config-routes-${crypto.randomBytes(8).toString('hex')}.sqlite`);

// Purge cache and set environment before requiring models
const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/')) {
      delete _require.cache[key];
    }
  });
};
purgeDatabaseCache();
process.env.DB_STORAGE = tempDbPath;

const configRoutes = (_require('../server/routes/configData') as { default: Router }).default;
const formulasConfigRoutes = (_require('../server/routes/formulasConfig') as { default: Router }).default;
const materialsConfigRoutes = (_require('../server/routes/materialsConfig') as { default: Router }).default;
const MappingService = _require('../server/services/mappings') as typeof import('../server/services/mappings');
const { CONFIG_FILES, ensureProjectDirs } = _require('../server/config/paths') as typeof import('../server/config/paths');
const { initDB, sequelize, Material } = _require('../server/models') as typeof import('../server/models');

let server: ReturnType<ReturnType<typeof express>['listen']>
let baseUrl: string
const materialsFile = CONFIG_FILES.materialsCatalog;
const lockFile = CONFIG_FILES.lockMapping;
const handleFile = CONFIG_FILES.handleMapping;
const originalMaterialsFile = fs.existsSync(materialsFile)
  ? fs.readFileSync(materialsFile, 'utf8')
  : null;
const originalLockFile = fs.existsSync(lockFile)
  ? fs.readFileSync(lockFile, 'utf8')
  : null;
const originalHandleFile = fs.existsSync(handleFile)
  ? fs.readFileSync(handleFile, 'utf8')
  : null;

async function seedPublishedMapping(profileCode: 'packaging' | 'handle' | 'lock' | 'cylinder' | 'lock_fork', payload: Record<string, unknown>) {
  const detail = await MappingService.getMappingDetail(profileCode);
  const currentRevision = detail && detail.ok
    ? detail.mapping.latestRevision?.revision ?? 0
    : 0;
  const draft = await MappingService.updateDraft(profileCode, {
    revision: currentRevision,
    payload,
    changeNote: 'test seed',
    operator: 'test-user',
  });
  assert.equal(draft.ok, true);
  const published = await MappingService.publish(profileCode, {
    fromRevision: draft.revision.revision,
    changeNote: 'test publish',
    operator: 'test-user',
  });
  assert.equal(published.ok, true);
  return published;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/config/formulas', formulasConfigRoutes);
  app.use('/api/config/material-catalog', materialsConfigRoutes);
  app.use('/api/config', configRoutes);

  return await new Promise<{ server: typeof server; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const { port } = (s.address() as { port: number });
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test.before(async () => {
  ensureProjectDirs();
  fs.writeFileSync(materialsFile, JSON.stringify({
    LEGACY001: {
      supplier: '旧供应商',
      name: '旧材料',
      unit: 'kg',
    },
  }, null, 2));
  await initDB();
  await Material.create({
    code: 'M-001',
    name: '测试物料',
    unit: 'pcs',
    category: 'Raw'
  });
  await Material.create({
    code: '华荣8181',
    name: '华荣8181',
    supplier: '华荣',
    model: '8181',
    unit: 'kg',
    category: 'Raw'
  });
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('formula lifecycle: create -> update draft -> publish -> published map', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      displayName: '测试配方',
      bom: [{ materialId: 'M-001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 2, paired: 2 } }],
      changeNote: 'create'
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.success, true);
  const formulaKey = created.formula.formulaKey;
  assert.match(formulaKey, /^F\d{8}-\d{4}$/);

  const updateRes = await fetch(`${baseUrl}/api/config/formulas/${formulaKey}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: created.revision.revision,
      bom: [{ materialId: 'M-001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 1.5, paired: 2 } }],
      changeNote: 'draft update'
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.success, true);

  const publishRes = await fetch(`${baseUrl}/api/config/formulas/${formulaKey}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: updated.revision.revision,
      changeNote: 'publish'
    })
  });
  assert.equal(publishRes.status, 200);
  const published = await publishRes.json();
  assert.equal(published.success, true);

  const publishedMapRes = await fetch(`${baseUrl}/api/config/formulas/published-map`);
  assert.equal(publishedMapRes.status, 200);
  const publishedMap = await publishedMapRes.json();
  assert.ok(publishedMap[formulaKey]);
  assert.equal(publishedMap[formulaKey].displayName, '测试配方');
  assert.ok(Array.isArray(publishedMap[formulaKey].bom));
  assert.ok(publishedMap['测试配方']);

  const archiveRes = await fetch(`${baseUrl}/api/config/formulas/${formulaKey}/archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      reason: 'archive for published-map filter check'
    })
  });
  assert.equal(archiveRes.status, 200);

  const archivedMapRes = await fetch(`${baseUrl}/api/config/formulas/published-map`);
  assert.equal(archivedMapRes.status, 200);
  const archivedMap = await archivedMapRes.json();
  assert.equal(archivedMap[formulaKey], undefined);
});

test('GET /api/config/formulas returns paged shape', async () => {
  const res = await fetch(`${baseUrl}/api/config/formulas`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.equal(typeof body.total, 'number');
  assert.equal(typeof body.page, 'number');
});

test('GET /api/config/packaging-mapping returns canonical DTO shape', async () => {
  await seedPublishedMapping('packaging', {
    supplierName: '方亮包装',
    mappings: {
      包装A: '外协包装A',
    },
  });

  const res = await fetch(`${baseUrl}/api/config/packaging-mapping`);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(typeof body.supplierName, 'string');
  assert.ok(body.supplierName.length > 0);
  assert.equal(typeof body.mappings, 'object');
  assert.equal(Array.isArray(body.mappings), false);
});

test('legacy handle mapping endpoints seed and publish workflow revisions', async () => {
  const initialPayload = {
    defaultSupplier: '旧拉手供应商',
    unmatchedSupplier: '待人工处理',
    manualReviewLabel: '未匹配拉手(待人工处理)',
    mappings: {
      拉手旧版: {
        supplier: '旧拉手供应商',
        vendorName: '旧拉手外协名',
        materialCode: 'HANDLE-LEGACY-001'
      },
    },
  };
  await seedPublishedMapping('handle', initialPayload);

  const getRes = await fetch(`${baseUrl}/api/config/handle`);
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.defaultSupplier, '旧拉手供应商');
  assert.equal(getBody.mappings['拉手旧版'].vendorName, '旧拉手外协名');
  assert.equal(getBody.mappings['拉手旧版'].materialCode, 'HANDLE-LEGACY-001');

  const workflowDetail = await MappingService.getMappingDetail('handle');
  assert.equal(workflowDetail!.ok, true);
  assert.equal(workflowDetail!.mapping.publishedRevision.revision, 2);
  assert.deepEqual(workflowDetail!.mapping.publishedPayload, getBody);

  const putRes = await fetch(`${baseUrl}/api/config/handle`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      defaultSupplier: '新拉手供应商',
      unmatchedSupplier: '待人工处理',
      manualReviewLabel: '未匹配拉手(待人工处理)',
      mappings: {
        拉手新版: {
          supplier: '新拉手供应商',
          vendorName: '新拉手外协名',
          materialCode: 'HANDLE-NEW-001'
        },
      },
    }),
  });
  assert.equal(putRes.status, 200);
  const putBody = await putRes.json();
  assert.equal(putBody.ok, true);
  assert.equal(putBody.revision.revision, 4);
  assert.equal(putBody.revision.state, 'published');

  const workflowAfterPut = await MappingService.getMappingDetail('handle');
  assert.equal(workflowAfterPut!.ok, true);
  assert.equal(workflowAfterPut!.mapping.publishedRevision.revision, 4);
  assert.deepEqual(workflowAfterPut!.mapping.publishedPayload, putBody.data);
  const handleFileAfter = fs.existsSync(handleFile) ? JSON.parse(fs.readFileSync(handleFile, 'utf8')) : null;
  assert.notDeepEqual(handleFileAfter, putBody.data);
});

test('legacy lock mapping endpoints seed and publish workflow revisions', async () => {
  const initialPayload = {
    defaultUnit: '套',
    primaryLabel: '主锁',
    secondaryLabel: '副锁',
    mappings: {
      'SD-9030（6607大锁）': {
        supplier: '旧锁具供应商',
        vendorName: '旧锁具外协名',
        primarySpec: '主锁体'
      },
    },
  };
  await seedPublishedMapping('lock', initialPayload);

  const getRes = await fetch(`${baseUrl}/api/config/lock`);
  assert.equal(getRes.status, 200);
  const getBody = await getRes.json();
  assert.equal(getBody.defaultUnit, '套');
  assert.equal(getBody.mappings['SD-9030（6607大锁）'].vendorName, '旧锁具外协名');

  const workflowDetail = await MappingService.getMappingDetail('lock');
  assert.equal(workflowDetail!.ok, true);
  assert.equal(workflowDetail!.mapping.publishedRevision.revision, 2);
  assert.deepEqual(workflowDetail!.mapping.publishedPayload, getBody);

  const putRes = await fetch(`${baseUrl}/api/config/lock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      defaultUnit: '套',
      primaryLabel: '主锁',
      secondaryLabel: '副锁',
      mappings: {
        'SD-9030（6607大锁）': {
          supplier: '新锁具供应商',
          vendorName: '新锁具外协名',
          primarySpec: '主锁体'
        },
      },
    }),
  });
  assert.equal(putRes.status, 200);
  const putBody = await putRes.json();
  assert.equal(putBody.ok, true);
  assert.equal(putBody.revision.state, 'published');

  const workflowAfterPut = await MappingService.getMappingDetail('lock');
  assert.equal(workflowAfterPut!.ok, true);
  assert.deepEqual(workflowAfterPut!.mapping.publishedPayload, putBody.data);
  const lockFileAfter = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, 'utf8')) : null;
  assert.notDeepEqual(lockFileAfter, putBody.data);
});

test('materials routes: legacy endpoint and workflow endpoints expose published catalog consistently', async () => {
  fs.writeFileSync(materialsFile, JSON.stringify({
    LEGACY001: {
      supplier: '旧供应商',
      name: '旧材料',
      unit: 'kg',
    },
  }, null, 2));

  const legacyRes = await fetch(`${baseUrl}/api/config/materials`);
  assert.equal(legacyRes.status, 200);
  const legacyBody = await legacyRes.json();
  assert.equal(legacyBody.LEGACY001.name, '旧材料');

  const publishedRes = await fetch(`${baseUrl}/api/config/material-catalog/published`);
  assert.equal(publishedRes.status, 200);
  const publishedBody = await publishedRes.json();
  assert.deepEqual(publishedBody, legacyBody);

  const detailRes = await fetch(`${baseUrl}/api/config/material-catalog/detail`);
  assert.equal(detailRes.status, 200);
  const detailBody = await detailRes.json();
  assert.equal(detailBody.success, true);
  assert.equal(detailBody.catalog.profile.profileCode, 'materials');
  assert.equal(detailBody.catalog.publishedRevision.revision, 1);
  assert.deepEqual(detailBody.catalog.publishedPayload, legacyBody);
});

test('materials routes: draft, publish and legacy POST stay workflow-compatible', async () => {
  const draftPayload = {
    LEGACY001: {
      supplier: '新供应商',
      name: '新材料',
      unit: 'kg',
    },
    LEGACY002: {
      supplier: '供应商B',
      name: '第二材料',
      unit: 'pcs',
    },
  };

  const draftRes = await fetch(`${baseUrl}/api/config/material-catalog/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      revision: 1,
      payload: draftPayload,
      changeNote: 'materials draft',
    }),
  });
  assert.equal(draftRes.status, 200);
  const draftBody = await draftRes.json();
  assert.equal(draftBody.success, true);
  assert.equal(draftBody.revision.revision, 2);

  const publishRes = await fetch(`${baseUrl}/api/config/material-catalog/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      fromRevision: 2,
      changeNote: 'materials publish',
    }),
  });
  assert.equal(publishRes.status, 200);
  const publishBody = await publishRes.json();
  assert.equal(publishBody.success, true);
  assert.equal(publishBody.revision.revision, 3);

  const afterPublishRes = await fetch(`${baseUrl}/api/config/material-catalog/published`);
  assert.equal(afterPublishRes.status, 200);
  const afterPublishBody = await afterPublishRes.json();
  assert.deepEqual(afterPublishBody, draftPayload);

  const legacySavePayload = {
    DIRECT001: {
      supplier: '直写供应商',
      name: '直写材料',
      unit: '套',
    },
  };
  const legacySaveRes = await fetch(`${baseUrl}/api/config/materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify(legacySavePayload),
  });
  assert.equal(legacySaveRes.status, 200);
  const legacySaveBody = await legacySaveRes.json();
  assert.equal(legacySaveBody.success, true);
  assert.equal(legacySaveBody.revision.revision, 5);
  assert.equal(legacySaveBody.revision.state, 'published');

  const revisionsRes = await fetch(`${baseUrl}/api/config/material-catalog/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisionsBody = await revisionsRes.json();
  assert.equal(revisionsBody.success, true);
  assert.deepEqual(
    revisionsBody.items.map((item: { revision: number; state: string }) => [item.revision, item.state]),
    [
      [5, 'published'],
      [4, 'archived'],
      [3, 'archived'],
      [2, 'archived'],
      [1, 'archived'],
    ],
  );

  const syncedLegacyFile = JSON.parse(fs.readFileSync(materialsFile, 'utf8'));
  assert.deepEqual(syncedLegacyFile, legacySavePayload);

  const auditLogsRes = await fetch(`${baseUrl}/api/config/material-catalog/audit-logs`);
  assert.equal(auditLogsRes.status, 200);
  const auditLogsBody = await auditLogsRes.json();
  assert.equal(auditLogsBody.success, true);
  assert.deepEqual(
    auditLogsBody.items.map((item: { action: string }) => item.action),
    ['publish', 'update_draft', 'publish', 'update_draft', 'seed_legacy'],
  );
});

test('create formula accepts supplier + model split and canonicalizes to material code', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      displayName: '供应商型号拆分校验',
      bom: [{ materialId: '8181', position: 'main', materialCategory: '塑粉', supplier: '华荣', usage: { single: 1, double: 1, paired: 2 } }],
      changeNote: 'create with supplier/model split'
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  const formulaKey = created.formula.formulaKey;
  assert.match(formulaKey, /^F\d{8}-\d{4}$/);

  const detailRes = await fetch(`${baseUrl}/api/config/formulas/${formulaKey}`);
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.formula.bom[0].materialId, '华荣8181');
});

test('/api/formulas is not mounted', async () => {
  const getRes = await fetch(`${baseUrl}/api/formulas`);
  assert.equal(getRes.status, 404);

  const postRes = await fetch(`${baseUrl}/api/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(postRes.status, 404);
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
  if (originalMaterialsFile === null) {
    if (fs.existsSync(materialsFile)) {
      fs.unlinkSync(materialsFile);
    }
  } else {
    fs.writeFileSync(materialsFile, originalMaterialsFile);
  }
  if (originalLockFile === null) {
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } else {
    fs.writeFileSync(lockFile, originalLockFile);
  }
  if (originalHandleFile === null) {
    if (fs.existsSync(handleFile)) {
      fs.unlinkSync(handleFile);
    }
  } else {
    fs.writeFileSync(handleFile, originalHandleFile);
  }
});
