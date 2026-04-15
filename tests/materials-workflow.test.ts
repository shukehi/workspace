import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url);
const TEST_DB = path.join(os.tmpdir(), `test-${crypto.randomBytes(8).toString('hex')}.sqlite`);

// Purge cache and set environment before requiring models
const purgeDatabaseCache = () => {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database') || key.includes('/server/models/')) {
      delete _require.cache[key];
    }
  });
};
purgeDatabaseCache();
process.env.DB_STORAGE = TEST_DB;

const { CONFIG_FILES, ensureProjectDirs } = _require('../server/config/paths') as typeof import('../server/config/paths');
const {
  initDB,
  sequelize,
  MaterialCatalogProfile,
  MaterialCatalogRevision,
  MaterialCatalogAuditLog,
} = _require('../server/models') as typeof import('../server/models');
import type { MaterialCatalogProfileInstance, MaterialCatalogRevisionInstance, MaterialCatalogAuditLogInstance } from '../server/models';
const MaterialCatalogWorkflow = _require('../server/services/materials') as typeof import('../server/services/materials');

const materialsFile = CONFIG_FILES.materialsCatalog;
const originalMaterialsFile = fs.existsSync(materialsFile)
  ? fs.readFileSync(materialsFile, 'utf8')
  : null;

const legacyPayload = {
  M001: {
    supplier: '供应商A',
    name: '旧材料A',
    unit: 'kg',
  },
};

test.before(async () => {
  ensureProjectDirs();
  await initDB();
});

test('materials workflow: seed from legacy file, update draft, publish and sync back to legacy file', async () => {
  fs.writeFileSync(materialsFile, JSON.stringify(legacyPayload, null, 2));

  const publishedFromSeed = await MaterialCatalogWorkflow.getPublishedMaterialsCatalog();
  assert.deepEqual(publishedFromSeed, legacyPayload);

  const detail = await MaterialCatalogWorkflow.getMaterialsCatalogDetail();
  assert.equal(detail.profile.profileCode, 'materials');
  assert.equal(detail.publishedRevision.revision, 1);
  assert.deepEqual(detail.publishedPayload, legacyPayload);

  const draftPayload = {
    M001: {
      supplier: '供应商A',
      name: '新材料A',
      unit: 'kg',
    },
    M002: {
      supplier: '供应商B',
      name: '新材料B',
      unit: 'pcs',
    },
  };

  const draftResult = await MaterialCatalogWorkflow.updateDraft({
    revision: detail.latestRevision.revision,
    payload: draftPayload,
    changeNote: 'update draft',
    operator: 'tester',
  });
  assert.equal(draftResult.ok, true);
  assert.equal(draftResult.revision.revision, 2);
  assert.equal(draftResult.revision.state, 'draft');

  const publishResult = await MaterialCatalogWorkflow.publish({
    fromRevision: draftResult.revision.revision,
    changeNote: 'publish draft',
    operator: 'tester',
  });
  assert.equal(publishResult.ok, true);
  assert.equal(publishResult.revision.revision, 3);
  assert.equal(publishResult.revision.state, 'published');

  const published = await MaterialCatalogWorkflow.getPublishedMaterialsCatalog();
  assert.deepEqual(published, draftPayload);

  const revisions = await MaterialCatalogWorkflow.listRevisions();
  assert.deepEqual(
    (revisions as { revision: number; state: string }[]).map((item) => [item.revision, item.state]),
    [
      [3, 'published'],
      [2, 'archived'],
      [1, 'archived'],
    ],
  );

  const profile = await MaterialCatalogProfile.findOne({ where: { profile_code: 'materials' } }) as MaterialCatalogProfileInstance | null;
  assert.ok(profile);
  assert.equal(profile!.active_revision, 3);

  const revisionRows = await MaterialCatalogRevision.findAll({
    where: { profile_id: profile!.id },
    order: [['revision', 'ASC']],
  });
  assert.deepEqual(
    (revisionRows as MaterialCatalogRevisionInstance[]).map((item) => item.state),
    ['archived', 'archived', 'published'],
  );

  const legacyFilePayload = JSON.parse(fs.readFileSync(materialsFile, 'utf8'));
  assert.deepEqual(legacyFilePayload, draftPayload);

  const auditLogs = await MaterialCatalogAuditLog.findAll({
    where: { profile_id: profile!.id },
    order: [['id', 'ASC']],
  });
  assert.deepEqual(
    (auditLogs as MaterialCatalogAuditLogInstance[]).map((item) => item.action),
    ['seed_legacy', 'update_draft', 'publish'],
  );
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }

  if (originalMaterialsFile === null) {
    if (fs.existsSync(materialsFile)) {
      fs.unlinkSync(materialsFile);
    }
    return;
  }

  fs.writeFileSync(materialsFile, originalMaterialsFile);
});
