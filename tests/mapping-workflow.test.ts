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

const {
  initDB,
  sequelize,
  MappingProfile,
  MappingRevision,
  MappingAuditLog,
} = _require('../server/models') as typeof import('../server/models');
import type { MappingProfileInstance, MappingRevisionInstance, MappingAuditLogInstance } from '../server/models';
const MappingWorkflow = _require('../server/services/mappings') as typeof import('../server/services/mappings');
const {
  PROFILE_CODES,
  REVISION_STATES,
} = _require('../server/services/mappings/mapping.constants') as typeof import('../server/services/mappings/mapping.constants');
const { CONFIG_FILES } = _require('../server/config/paths') as typeof import('../server/config/paths');

const packagingPayload = {
  supplierName: '方亮包装',
  mappings: {
    包装A: '外协包装A',
  },
};

const originalCylinderMappingFile = fs.existsSync(CONFIG_FILES.cylinderMapping)
  ? fs.readFileSync(CONFIG_FILES.cylinderMapping, 'utf8')
  : null;

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

test('getPublishedMapping returns null before first publish and payload after publish', async () => {
  const beforeProfileExists = await MappingWorkflow.getPublishedMapping(PROFILE_CODES.CYLINDER);
  assert.equal(beforeProfileExists, null);

  const draft = await MappingWorkflow.updateDraft(PROFILE_CODES.CYLINDER, {
    revision: 0,
    payload: {
      dimensions: {
        7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
      },
    },
    changeNote: 'create cylinder draft',
    operator: 'tester',
  });
  assert.equal(draft.ok, true);

  const beforePublish = await MappingWorkflow.getPublishedMapping(PROFILE_CODES.CYLINDER);
  assert.equal(beforePublish?.ok, true);
  assert.equal(beforePublish?.payload ?? null, null);

  const published = await MappingWorkflow.publish(PROFILE_CODES.CYLINDER, {
    fromRevision: draft.revision.revision,
    changeNote: 'publish cylinder draft',
    operator: 'tester',
  });
  assert.equal(published.ok, true);

  const afterPublish = await MappingWorkflow.getPublishedMapping(PROFILE_CODES.CYLINDER);
  assert.equal(afterPublish?.ok, true);
  assert.deepEqual(afterPublish?.payload, {
    dimensions: {
      7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
    },
  });
});

test('mapping workflow backfills cylinder accessory material codes from legacy file when published payload is incomplete', async () => {
  fs.writeFileSync(CONFIG_FILES.cylinderMapping, JSON.stringify({
    secondaryAccessoryPackRules: [
      {
        conditionField: 'fshz',
        keyword: '一号铝小面板',
        supplier: '巨力',
        itemName: '铝小面板 - 单开',
        unit: '个',
        thicknessAccessoryPacks: {
          '5': '5 公分配件包',
          '7': '7 公分配件包',
        },
        thicknessMaterialCodes: {
          '5': 'ACC-FSHZ-YHLXMB-5',
          '7': 'ACC-FSHZ-YHLXMB-7',
        },
      },
    ],
  }, null, 2));

  const profile = await MappingProfile.findOne({
    where: { profile_code: PROFILE_CODES.CYLINDER },
  }) as MappingProfileInstance | null;
  assert.ok(profile);

  await MappingRevision.create({
    profile_id: profile!.id,
    revision: 99,
    state: REVISION_STATES.PUBLISHED,
    schema_version: 1,
    payload_json: JSON.stringify({
      dimensions: {
        7: { code: '90AB', eccentricity: '34.5*55.5/中心孔偏心' },
      },
      secondaryAccessoryPackRules: [
        {
          conditionField: 'fshz',
          keyword: '一号铝小面板',
          supplier: '巨力',
          itemName: '铝小面板 - 单开',
          unit: '个',
          thicknessAccessoryPacks: {
            '5': '5 公分配件包',
            '7': '7 公分配件包',
          },
        },
      ],
      mappings: {},
    }),
    change_note: 'seed incomplete published revision',
    created_by: 'tester',
  });

  const detail = await MappingWorkflow.getMappingDetail(PROFILE_CODES.CYLINDER);
  assert.equal(detail?.ok, true);
  assert.deepEqual(detail?.mapping.publishedPayload.secondaryAccessoryPackRules?.[0]?.thicknessMaterialCodes, {
    '5': 'ACC-FSHZ-YHLXMB-5',
    '7': 'ACC-FSHZ-YHLXMB-7',
  });

  const payload = await MappingWorkflow.getPublishedMapping(PROFILE_CODES.CYLINDER);
  assert.equal(payload?.ok, true);
  assert.deepEqual(payload?.payload.secondaryAccessoryPackRules?.[0]?.thicknessMaterialCodes, {
    '5': 'ACC-FSHZ-YHLXMB-5',
    '7': 'ACC-FSHZ-YHLXMB-7',
  });
});

test.after(async () => {
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }
  if (originalCylinderMappingFile === null) {
    if (fs.existsSync(CONFIG_FILES.cylinderMapping)) {
      fs.unlinkSync(CONFIG_FILES.cylinderMapping);
    }
  } else {
    fs.writeFileSync(CONFIG_FILES.cylinderMapping, originalCylinderMappingFile);
  }
});
