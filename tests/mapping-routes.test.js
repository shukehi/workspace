const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const tempDbPath = path.join(os.tmpdir(), `mapping-routes-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const mappingsConfigRoutes = require('../server/routes/mappingsConfig');
const { initDB, sequelize } = require('../server/models');
const { PROFILE_CODES } = require('../server/services/mappings/mapping.constants');

const packagingPayload = {
  supplierName: '方亮包装',
  mappings: {
    包装A: '外协包装A',
  },
};

let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/config/mappings', mappingsConfigRoutes);

  return await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address();
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`,
      });
    });
  });
}

test.before(async () => {
  await initDB();
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('mapping routes: detail, draft update, publish, rollback and revisions work through HTTP skeleton', async () => {
  const createDraftRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      payload: packagingPayload,
      changeNote: 'init draft',
    }),
  });
  assert.equal(createDraftRes.status, 200);
  const created = await createDraftRes.json();
  assert.equal(created.success, true);
  assert.equal(created.revision.revision, 1);
  assert.equal(created.profile.profileCode, PROFILE_CODES.PACKAGING);

  const detailRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/detail`);
  assert.equal(detailRes.status, 200);
  const detail = await detailRes.json();
  assert.equal(detail.success, true);
  assert.equal(detail.mapping.latestRevision.revision, 1);
  assert.deepEqual(detail.mapping.draftPayload, packagingPayload);

  const summaryRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}`);
  assert.equal(summaryRes.status, 200);
  const summary = await summaryRes.json();
  assert.equal(summary.success, true);
  assert.equal(summary.mapping.profileCode, PROFILE_CODES.PACKAGING);
  assert.equal(summary.mapping.draftPayload, undefined);

  const updateDraftRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      revision: 1,
      payload: {
        supplierName: '方亮包装',
        mappings: {
          包装A: '外协包装A',
          包装B: '外协包装B',
        },
      },
      changeNote: 'update draft',
    }),
  });
  assert.equal(updateDraftRes.status, 200);
  const updated = await updateDraftRes.json();
  assert.equal(updated.success, true);
  assert.equal(updated.revision.revision, 2);

  const publishRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      fromRevision: 2,
      changeNote: 'publish draft',
    }),
  });
  assert.equal(publishRes.status, 200);
  const published = await publishRes.json();
  assert.equal(published.success, true);
  assert.equal(published.revision.revision, 3);
  assert.equal(published.revision.state, 'published');

  const rollbackRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      targetRevision: 1,
      reason: 'rollback route test',
    }),
  });
  assert.equal(rollbackRes.status, 200);
  const rollback = await rollbackRes.json();
  assert.equal(rollback.success, true);
  assert.equal(rollback.revision.revision, 4);
  assert.equal(rollback.activeRevision, 3);

  const revisionsRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/revisions`);
  assert.equal(revisionsRes.status, 200);
  const revisions = await revisionsRes.json();
  assert.equal(revisions.success, true);
  assert.deepEqual(
    revisions.items.map((item) => [item.revision, item.state]),
    [
      [4, 'draft'],
      [3, 'published'],
      [2, 'archived'],
      [1, 'archived'],
    ],
  );
});

test('mapping routes: 404, 409 and 422 base behaviors stay aligned with workflow skeleton', async () => {
  const missingDetailRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.CYLINDER}/detail`);
  assert.equal(missingDetailRes.status, 404);

  const invalidTypeRes = await fetch(`${baseUrl}/api/config/mappings/not-supported/detail`);
  assert.equal(invalidTypeRes.status, 422);
  const invalidTypeBody = await invalidTypeRes.json();
  assert.equal(invalidTypeBody.success, false);
  assert.equal(invalidTypeBody.errors[0].field, 'profileCode');
  assert.equal(invalidTypeBody.errors[0].code, 'unsupported-profile');

  const invalidPayloadRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.LOCK_FORK}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      payload: null,
    }),
  });
  assert.equal(invalidPayloadRes.status, 422);
  const invalidPayload = await invalidPayloadRes.json();
  assert.equal(invalidPayload.success, false);
  assert.equal(Array.isArray(invalidPayload.errors), true);

  const conflictRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.PACKAGING}/draft`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      revision: 1,
      payload: packagingPayload,
      changeNote: 'stale update',
    }),
  });
  assert.equal(conflictRes.status, 409);
  const conflict = await conflictRes.json();
  assert.equal(conflict.success, false);
  assert.equal(conflict.latestRevision, 4);
  assert.equal(conflict.errors[0].code, 'revision-conflict');

  const missingPublishRes = await fetch(`${baseUrl}/api/config/mappings/${PROFILE_CODES.CYLINDER}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-operator': 'route-tester' },
    body: JSON.stringify({
      fromRevision: 1,
    }),
  });
  assert.equal(missingPublishRes.status, 404);
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
