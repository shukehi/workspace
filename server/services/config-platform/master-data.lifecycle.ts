import type { Transaction } from 'sequelize';
import { Material, SupplierMaster } from '../../models';
import type { MaterialInstance, SupplierMasterInstance } from '../../models';
import MasterDataLifecycleRepository from './master-data.lifecycle.repository';

type MasterDataProfileCode = 'supplier_master' | 'material_master';

type RevisionMeta = {
  revision: number;
  state: string;
  changeNote: string;
  createdBy: string;
  createdAt: string | null;
};

type MasterDataWorkflowDetail = {
  profile: {
    profileCode: MasterDataProfileCode;
    displayName: string;
    status: string;
    activeRevision: number | null;
  };
  latestRevision: RevisionMeta | null;
  draftRevision: RevisionMeta | null;
  publishedRevision: RevisionMeta | null;
  draftPayload: Record<string, unknown>[] | null;
  publishedPayload: Record<string, unknown>[] | null;
};

const PROFILE_META: Record<MasterDataProfileCode, { displayName: string }> = {
  supplier_master: { displayName: '供应商主数据' },
  material_master: { displayName: '物料主数据' },
};

function parsePayload(payloadJson: unknown): Record<string, unknown>[] {
  if (!payloadJson) return [];
  try {
    const parsed = JSON.parse(String(payloadJson));
    return Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [];
  } catch {
    return [];
  }
}

function serializePayload(payload: unknown): string {
  return JSON.stringify(Array.isArray(payload) ? payload : []);
}

function toRevisionMeta(revision?: any): RevisionMeta | null {
  if (!revision) return null;
  const plain = typeof revision.get === 'function' ? revision.get({ plain: true }) : revision;
  return {
    revision: Number(plain.revision || 0),
    state: String(plain.state || ''),
    changeNote: String(plain.change_note || ''),
    createdBy: String(plain.created_by || 'system-admin'),
    createdAt: plain.created_at || null,
  };
}

async function snapshotSupplierPayload(transaction?: Transaction): Promise<Record<string, unknown>[]> {
  const rows = await SupplierMaster.findAll({ order: [['id', 'ASC']], transaction }) as SupplierMasterInstance[];
  return rows.map((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    return {
      id: Number((plain as any).id),
      supplier_name: String((plain as any).supplier_name || ''),
      normalized_name: String((plain as any).normalized_name || ''),
      status: String((plain as any).status || 'active'),
      source_note: (plain as any).source_note || null,
    };
  });
}

async function snapshotMaterialPayload(transaction?: Transaction): Promise<Record<string, unknown>[]> {
  const rows = await Material.findAll({ order: [['id', 'ASC']], transaction }) as MaterialInstance[];
  return rows.map((row) => {
    const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row;
    return {
      id: Number((plain as any).id),
      code: String((plain as any).code || ''),
      name: String((plain as any).name || ''),
      model: String((plain as any).model || ''),
      supplier: String((plain as any).supplier || ''),
      supplier_master_id: (plain as any).supplier_master_id ?? null,
      unit: String((plain as any).unit || ''),
      price: Number((plain as any).price || 0),
      category: String((plain as any).category || ''),
      aliases: Array.isArray((plain as any).aliases) ? (plain as any).aliases : [],
    };
  });
}

async function snapshotPayload(profileCode: MasterDataProfileCode, transaction?: Transaction): Promise<Record<string, unknown>[]> {
  if (profileCode === 'supplier_master') return await snapshotSupplierPayload(transaction);
  return await snapshotMaterialPayload(transaction);
}

async function applySupplierPayload(payload: Record<string, unknown>[], transaction: Transaction) {
  const targetIds = payload.map((item) => Number(item.id || 0)).filter((id) => id > 0);
  for (const item of payload) {
    const id = Number(item.id || 0);
    const values = {
      id,
      supplier_name: String(item.supplier_name || ''),
      normalized_name: String(item.normalized_name || '').toLowerCase(),
      status: String(item.status || 'active') === 'inactive' ? 'inactive' : 'active',
      source_note: item.source_note ? String(item.source_note) : null,
    };
    const existing = await SupplierMaster.findByPk(id, { transaction });
    if (existing) {
      await existing.update(values as any, { transaction });
    } else {
      await SupplierMaster.create(values as any, { transaction });
    }
  }

  if (targetIds.length > 0) {
    await SupplierMaster.update(
      { status: 'inactive' },
      {
        where: {
          id: { [require('sequelize').Op.notIn]: targetIds },
        },
        transaction,
      },
    );
    await Material.update(
      { supplier_master_id: null },
      {
        where: {
          supplier_master_id: { [require('sequelize').Op.notIn]: targetIds },
        },
        transaction,
      },
    );
  }
}

async function applyMaterialPayload(payload: Record<string, unknown>[], transaction: Transaction) {
  const validSupplierIds = new Set(
    (await SupplierMaster.findAll({ attributes: ['id'], transaction }) as Array<any>).map((item) => Number((typeof item.get === 'function' ? item.get({ plain: true }) : item).id || 0)),
  );

  for (const item of payload) {
    const id = Number(item.id || 0);
    const supplierMasterId = Number(item.supplier_master_id || 0);
    const values = {
      id,
      code: String(item.code || ''),
      name: String(item.name || ''),
      model: String(item.model || ''),
      supplier: String(item.supplier || ''),
      supplier_master_id: validSupplierIds.has(supplierMasterId) ? supplierMasterId : null,
      unit: String(item.unit || ''),
      price: Number(item.price || 0),
      category: String(item.category || ''),
      aliases: Array.isArray(item.aliases) ? item.aliases : [],
    };
    const existing = await Material.findByPk(id, { transaction });
    if (existing) {
      await existing.update(values as any, { transaction });
    } else {
      await Material.create(values as any, { transaction });
    }
  }
}

async function applyPayload(profileCode: MasterDataProfileCode, payload: Record<string, unknown>[], transaction: Transaction) {
  if (profileCode === 'supplier_master') {
    await applySupplierPayload(payload, transaction);
    return;
  }
  await applyMaterialPayload(payload, transaction);
}

async function ensureSeededProfile(profileCode: MasterDataProfileCode, transaction?: Transaction) {
  let profile = await MasterDataLifecycleRepository.findProfileByCode(profileCode, transaction);
  if (!profile) {
    profile = await MasterDataLifecycleRepository.createProfile({
      profile_code: profileCode,
      display_name: PROFILE_META[profileCode].displayName,
      status: 'active',
      active_revision: null,
    }, transaction);
  }

  const latest = await MasterDataLifecycleRepository.findLatestRevision((profile as any).id, transaction);
  if (latest) return profile;

  const initialPayload = await snapshotPayload(profileCode, transaction);
  const initialRevision = await MasterDataLifecycleRepository.createRevision({
    profile_id: (profile as any).id,
    revision: 1,
    state: 'published',
    payload_json: serializePayload(initialPayload),
    change_note: 'seed current live state',
    created_by: 'system-admin',
  }, transaction);

  await MasterDataLifecycleRepository.updateProfile((profile as any).id, {
    status: 'active',
    active_revision: (initialRevision as any).revision,
  }, transaction);

  return profile;
}

export async function getMasterDataWorkflowDetail(profileCode: MasterDataProfileCode): Promise<MasterDataWorkflowDetail> {
  return MasterDataLifecycleRepository.withTransaction(async (transaction) => {
    const profile = await ensureSeededProfile(profileCode, transaction) as any;
    const [latestRevision, draftRevision, publishedRevision] = await Promise.all([
      MasterDataLifecycleRepository.findLatestRevision(profile.id, transaction),
      MasterDataLifecycleRepository.findDraftRevision(profile.id, transaction),
      MasterDataLifecycleRepository.findPublishedRevision(profile.id, transaction),
    ]);
    return {
      profile: {
        profileCode,
        displayName: PROFILE_META[profileCode].displayName,
        status: String(profile.status || 'active'),
        activeRevision: Number.isInteger(Number(profile.active_revision)) ? Number(profile.active_revision) : null,
      },
      latestRevision: toRevisionMeta(latestRevision),
      draftRevision: toRevisionMeta(draftRevision),
      publishedRevision: toRevisionMeta(publishedRevision),
      draftPayload: draftRevision ? parsePayload((draftRevision as any).payload_json) : null,
      publishedPayload: publishedRevision ? parsePayload((publishedRevision as any).payload_json) : null,
    };
  });
}

export async function syncMasterDataDraft(profileCode: MasterDataProfileCode, changeNote: string, operator = 'system-admin') {
  return MasterDataLifecycleRepository.withTransaction(async (transaction) => {
    const profile = await ensureSeededProfile(profileCode, transaction) as any;
    const latest = await MasterDataLifecycleRepository.findLatestRevision(profile.id, transaction) as any;
    const nextRevision = Number(latest?.revision || 0) + 1;
    const payload = await snapshotPayload(profileCode, transaction);
    await MasterDataLifecycleRepository.updateRevisionStates(profile.id, 'draft', 'archived', transaction);
    const draft = await MasterDataLifecycleRepository.createRevision({
      profile_id: profile.id,
      revision: nextRevision,
      state: 'draft',
      payload_json: serializePayload(payload),
      change_note: changeNote,
      created_by: operator,
    }, transaction);
    await MasterDataLifecycleRepository.updateProfile(profile.id, { status: 'draft' }, transaction);
    return toRevisionMeta(draft);
  });
}

export async function publishMasterDataProfile(profileCode: MasterDataProfileCode, params: { fromRevision: number | string; changeNote?: string; operator?: string }) {
  return MasterDataLifecycleRepository.withTransaction(async (transaction) => {
    const profile = await ensureSeededProfile(profileCode, transaction) as any;
    const draft = await MasterDataLifecycleRepository.findDraftRevision(profile.id, transaction) as any;
    if (!draft) {
      return { ok: false, status: 409, errors: [{ field: 'fromRevision', message: '当前没有可发布的 draft' }] };
    }
    if (Number(draft.revision) !== Number(params.fromRevision)) {
      return { ok: false, status: 409, errors: [{ field: 'fromRevision', message: '只能发布当前 draft revision' }], latestRevision: draft.revision };
    }
    const latest = await MasterDataLifecycleRepository.findLatestRevision(profile.id, transaction) as any;
    const nextRevision = Number(latest?.revision || 0) + 1;
    await MasterDataLifecycleRepository.updateRevisionStates(profile.id, 'published', 'archived', transaction);
    await MasterDataLifecycleRepository.updateRevisionStates(profile.id, 'draft', 'archived', transaction);
    const published = await MasterDataLifecycleRepository.createRevision({
      profile_id: profile.id,
      revision: nextRevision,
      state: 'published',
      payload_json: draft.payload_json,
      change_note: params.changeNote || '发布版本',
      created_by: params.operator || 'system-admin',
    }, transaction);
    await MasterDataLifecycleRepository.updateProfile(profile.id, { status: 'active', active_revision: nextRevision }, transaction);
    return { ok: true, revision: toRevisionMeta(published) };
  });
}

export async function rollbackMasterDataProfile(profileCode: MasterDataProfileCode, params: { targetRevision: number | string; reason?: string; operator?: string }) {
  return MasterDataLifecycleRepository.withTransaction(async (transaction) => {
    const profile = await ensureSeededProfile(profileCode, transaction) as any;
    const target = await MasterDataLifecycleRepository.findRevisionByNumber(profile.id, params.targetRevision, transaction) as any;
    if (!target) {
      return { ok: false, status: 404, errors: [{ field: 'targetRevision', message: '目标 revision 不存在' }] };
    }
    const payload = parsePayload(target.payload_json);
    await applyPayload(profileCode, payload, transaction);
    const latest = await MasterDataLifecycleRepository.findLatestRevision(profile.id, transaction) as any;
    const nextRevision = Number(latest?.revision || 0) + 1;
    await MasterDataLifecycleRepository.updateRevisionStates(profile.id, 'published', 'archived', transaction);
    await MasterDataLifecycleRepository.updateRevisionStates(profile.id, 'draft', 'archived', transaction);
    const published = await MasterDataLifecycleRepository.createRevision({
      profile_id: profile.id,
      revision: nextRevision,
      state: 'published',
      payload_json: target.payload_json,
      change_note: params.reason ? `rollback:${params.reason}` : 'rollback',
      created_by: params.operator || 'system-admin',
    }, transaction);
    await MasterDataLifecycleRepository.updateProfile(profile.id, { status: 'active', active_revision: nextRevision }, transaction);
    return { ok: true, revision: toRevisionMeta(published), activeRevision: nextRevision };
  });
}

export async function listMasterDataRevisions(profileCode: MasterDataProfileCode) {
  return MasterDataLifecycleRepository.withTransaction(async (transaction) => {
    const profile = await ensureSeededProfile(profileCode, transaction) as any;
    const rows = await MasterDataLifecycleRepository.listRevisions(profile.id, transaction) as any[];
    return rows.map((row) => toRevisionMeta(row)).filter(Boolean);
  });
}
