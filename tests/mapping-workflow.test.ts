import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const tempDbPath = path.join(os.tmpdir(), `mapping-workflow-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const {
  initDB,
  sequelize,
  MappingProfile,
  MappingRevision,
  MappingAuditLog,
} = require('../server/models') as typeof import('../server/models');
import type { MappingProfileInstance, MappingRevisionInstance, MappingAuditLogInstance } from '../server/models';
const MappingWorkflow = require('../server/services/mappings') as typeof import('../server/services/mappings');
const {
  PROFILE_CODES,
  REVISION_STATES,
} = require('../server/services/mappings/mapping.constants') as typeof import('../server/services/mappings/mapping.constants');

const packagingPayload = {
  supplierName: '方亮包装',
  mappings: {
    包装A: '外协包装A',
  },
};

test.before(async () => {
  await initDB();
});

test('mapping workflow skeleton: enforces single draft, optimistic lock, publish switch and rollback-to-draft flow', async () => {
  const created = await MappingWorkflow.updateDraft(PROFILE_CODES.PACKAGING, {
    payload: packagingPayload,
    changeNote: 'init draft',
    operator: 'tester',
  });
  assert.equal(created.ok, true);
  assert.equal(created.revision.revision, 1);
  assert.equal(created.revision.state, REVISION_STATES.DRAFT);

  const mappingList = await MappingWorkflow.listMappings();
  assert.equal(mappingList.length, 1);
  assert.equal(mappingList[0].profileCode, PROFILE_CODES.PACKAGING);
  assert.equal(mappingList[0].displayName, '包装映射');

  const conflict = await MappingWorkflow.updateDraft(PROFILE_CODES.PACKAGING, {
    revision: 999,
    payload: packagingPayload,
    operator: 'tester',
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 409);
  assert.equal(conflict.latestRevision, 1);

  const updated = await MappingWorkflow.updateDraft(PROFILE_CODES.PACKAGING, {
    revision: 1,
    payload: {
      supplierName: '方亮包装',
      mappings: {
        包装A: '外协包装A',
        包装B: '外协包装B',
      },
    },
    changeNote: 'update draft',
    operator: 'tester',
  });
  assert.equal(updated.ok, true);
  assert.equal(updated.revision.revision, 2);
  assert.equal(updated.revision.state, REVISION_STATES.DRAFT);

  let detail = await MappingWorkflow.getMappingDetail(PROFILE_CODES.PACKAGING);
  assert.equal(detail!.ok, true);
  assert.equal(detail!.mapping.latestRevision.revision, 2);
  assert.equal(detail!.mapping.draftRevision.revision, 2);
  assert.equal(detail!.mapping.publishedRevision, null);

  const published = await MappingWorkflow.publish(PROFILE_CODES.PACKAGING, {
    fromRevision: 2,
    changeNote: 'publish current draft',
    operator: 'tester',
  });
  assert.equal(published.ok, true);
  assert.equal(published.revision.revision, 3);
  assert.equal(published.revision.state, REVISION_STATES.PUBLISHED);

  detail = await MappingWorkflow.getMappingDetail(PROFILE_CODES.PACKAGING);
  assert.equal(detail!.ok, true);
  assert.equal(detail!.mapping.activeRevision, 3);
  assert.equal(detail!.mapping.draftRevision, null);
  assert.equal(detail!.mapping.publishedRevision.revision, 3);

  const rollback = await MappingWorkflow.rollback(PROFILE_CODES.PACKAGING, {
    targetRevision: 1,
    reason: 'rollback to first draft payload',
    operator: 'tester',
  });
  assert.equal(rollback.ok, true);
  assert.equal(rollback.revision.revision, 4);
  assert.equal(rollback.revision.state, REVISION_STATES.DRAFT);
  assert.equal(rollback.activeRevision, 3);

  detail = await MappingWorkflow.getMappingDetail(PROFILE_CODES.PACKAGING);
  assert.equal(detail!.ok, true);
  assert.equal(detail!.mapping.activeRevision, 3);
  assert.equal(detail!.mapping.latestRevision.revision, 4);
  assert.equal(detail!.mapping.draftRevision.revision, 4);
  assert.equal(detail!.mapping.publishedRevision.revision, 3);
  assert.deepEqual(detail!.mapping.draftPayload, packagingPayload);

  const revisions = await MappingWorkflow.listRevisions(PROFILE_CODES.PACKAGING);
  assert.equal(revisions!.ok, true);
  assert.deepEqual(
    revisions!.revisions.map((item: { revision: number; state: string }) => [item.revision, item.state]),
    [
      [4, REVISION_STATES.DRAFT],
      [3, REVISION_STATES.PUBLISHED],
      [2, REVISION_STATES.ARCHIVED],
      [1, REVISION_STATES.ARCHIVED],
    ],
  );

  const profile = await MappingProfile.findOne({ where: { profile_code: PROFILE_CODES.PACKAGING } }) as MappingProfileInstance | null;
  assert.equal(profile!.active_revision, 3);

  const revisionRows = await MappingRevision.findAll({
    where: { profile_id: profile!.id },
    order: [['revision', 'ASC']],
  });
  assert.deepEqual(
    (revisionRows as MappingRevisionInstance[]).map((item) => item.state),
    [
      REVISION_STATES.ARCHIVED,
      REVISION_STATES.ARCHIVED,
      REVISION_STATES.PUBLISHED,
      REVISION_STATES.DRAFT,
    ],
  );

  const auditLogs = await MappingAuditLog.findAll({
    where: { profile_id: profile!.id },
    order: [['id', 'ASC']],
  });
  assert.deepEqual(
    (auditLogs as MappingAuditLogInstance[]).map((item) => item.action),
    ['create_draft', 'update_draft', 'publish', 'rollback'],
  );
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
