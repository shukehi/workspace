import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const tempDbPath = path.join(os.tmpdir(), `mapping-repository-${Date.now()}.sqlite`);
process.env.DB_STORAGE = tempDbPath;

const {
  initDB,
  sequelize,
  MappingProfile,
  MappingRevision,
  MappingAuditLog,
  MappingUnmatchedEvent,
} = require('../server/models') as typeof import('../server/models');
import type { MappingUnmatchedEventInstance } from '../server/models';
const MappingRepository = require('../server/services/mappings/mapping.repository') as typeof import('../server/services/mappings/mapping.repository').default;
const {
  PROFILE_CODES,
  REVISION_STATES,
  SCHEMA_VERSION,
} = require('../server/services/mappings/mapping.constants') as typeof import('../server/services/mappings/mapping.constants');

test.before(async () => {
  await initDB();
});

test('mapping repository: initDB creates tables and repository methods persist profile/revisions/audit logs', async () => {
  const queryInterface = sequelize.getQueryInterface();

  const profileTable = await queryInterface.describeTable('mapping_profiles');
  const revisionTable = await queryInterface.describeTable('mapping_revisions');
  const auditTable = await queryInterface.describeTable('mapping_audit_logs');
  const unmatchedTable = await queryInterface.describeTable('mapping_unmatched_events');

  assert.ok(profileTable.profile_code);
  assert.ok(revisionTable.schema_version);
  assert.ok(auditTable.action);
  assert.ok(unmatchedTable.raw_value);

  const profile = await MappingRepository.createProfile({
    profile_code: PROFILE_CODES.PACKAGING,
    display_name: '包装映射',
    status: 'active',
    active_revision: null,
  });

  const draftRevision = await MappingRepository.createRevision({
    profile_id: profile.id,
    revision: 1,
    state: REVISION_STATES.DRAFT,
    schema_version: SCHEMA_VERSION,
    payload_json: JSON.stringify({ supplierName: '方亮包装', mappings: { 包装A: '外协A' } }),
    change_note: 'draft',
    created_by: 'tester',
  });

  const publishedRevision = await MappingRepository.createRevision({
    profile_id: profile.id,
    revision: 2,
    state: REVISION_STATES.PUBLISHED,
    schema_version: SCHEMA_VERSION,
    payload_json: JSON.stringify({ supplierName: '方亮包装', mappings: { 包装A: '外协A' } }),
    change_note: 'published',
    created_by: 'tester',
  });

  const auditLog = await MappingRepository.createAuditLog({
    profile_id: profile.id,
    action: 'publish',
    from_revision: 1,
    to_revision: 2,
    operator: 'tester',
    meta_json: JSON.stringify({ changeNote: 'publish' }),
  });

  await MappingRepository.updateProfile(profile.id, {
    active_revision: 2,
  });

  const foundProfile = await MappingRepository.findProfileByCode(PROFILE_CODES.PACKAGING);
  const latestRevision = await MappingRepository.findLatestRevisionByProfileId(profile.id);
  const foundDraft = await MappingRepository.findDraftRevisionByProfileId(profile.id);
  const foundPublished = await MappingRepository.findPublishedRevisionByProfileId(profile.id);
  const revisions = await MappingRepository.listRevisionsByProfileId(profile.id);
  const publishedRows = await MappingRepository.listPublishedRevisionsByProfileIds([profile.id]);

  assert.equal(foundProfile.active_revision, 2);
  assert.equal(latestRevision.revision, 2);
  assert.equal(foundDraft.id, draftRevision.id);
  assert.equal(foundPublished.id, publishedRevision.id);
  assert.deepEqual(revisions.map((item) => item.revision), [2, 1]);
  assert.deepEqual(publishedRows.map((item) => item.revision), [2]);
  assert.equal(auditLog.action, 'publish');
});

test('mapping models: unmatched event model stores counters and timestamps', async () => {
  const event = await MappingUnmatchedEvent.create({
    profile_code: PROFILE_CODES.CYLINDER,
    raw_value: '未命中锁芯',
    sample_json: JSON.stringify({ spec: '960*2050/10/内开外包' }),
    hit_count: 3,
    status: 'open',
  }) as MappingUnmatchedEventInstance;

  const stored = await MappingUnmatchedEvent.findByPk(event.id) as MappingUnmatchedEventInstance | null;
  assert.equal(stored!.profile_code, PROFILE_CODES.CYLINDER);
  assert.equal(stored!.hit_count, 3);
  assert.ok(stored!.first_seen_at);
  assert.ok(stored!.last_seen_at);
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(tempDbPath)) {
    fs.unlinkSync(tempDbPath);
  }
});
