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
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('formula lifecycle: create -> update draft -> publish -> published map', async () => {
  const createRes = await fetch(`${baseUrl}/api/config/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'test-user' },
    body: JSON.stringify({
      formulaKey: 'TEST_F001',
      displayName: '测试配方',
      bom: [{ materialId: 'M-001', position: 'main', materialCategory: '油漆', supplier: '供应商A', usage: { single: 1, double: 2, paired: 2 } }],
      changeNote: 'create'
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json();
  assert.equal(created.success, true);

  const updateRes = await fetch(`${baseUrl}/api/config/formulas/TEST_F001/draft`, {
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

  const publishRes = await fetch(`${baseUrl}/api/config/formulas/TEST_F001/publish`, {
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
  assert.ok(publishedMap.TEST_F001);
  assert.equal(publishedMap.TEST_F001.displayName, '测试配方');
  assert.ok(Array.isArray(publishedMap.TEST_F001.bom));
});

test('GET /api/config/formulas returns paged shape', async () => {
  const res = await fetch(`${baseUrl}/api/config/formulas`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.items));
  assert.equal(typeof body.total, 'number');
  assert.equal(typeof body.page, 'number');
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
