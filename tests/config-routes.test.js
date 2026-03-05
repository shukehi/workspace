const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tempDbPath = path.join(os.tmpdir(), `formula-routes-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const configRoutes = require('../server/routes/configData');
const formulasConfigRoutes = require('../server/routes/formulasConfig');
const { initDB, sequelize, Material } = require('../server/models');

let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/config/formulas', formulasConfigRoutes);
  app.use('/api/config', configRoutes);

  return await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address();
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test.before(async () => {
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
    await new Promise((resolve) => server.close(resolve));
  }
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
