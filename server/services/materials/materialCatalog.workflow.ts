import type { Transaction } from 'sequelize';
import MaterialCatalogRepository from './materialCatalog.repository';
import type { PlainRecord } from '../../shared/types';

const PROFILE_CODE = 'materials';
const PROFILE_NAME = 'Materials Catalog';
const AUDIT_ACTIONS = Object.freeze({
    SEED_LEGACY: 'seed_legacy',
    CREATE_DRAFT: 'create_draft',
    UPDATE_DRAFT: 'update_draft',
    PUBLISH: 'publish'
} as const);

interface DraftParams {
    revision?: number | string | null;
    payload: PlainRecord;
    changeNote?: string;
    operator?: string;
}

interface PublishParams {
    fromRevision: number | string;
    changeNote?: string;
    operator?: string;
}

export function operatorFromRequest(req?: PlainRecord): string {
    const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
    return String(fromHeader || 'system-admin');
}

export function parsePayload(payloadJson: unknown): PlainRecord {
    if (!payloadJson) return {};
    try {
        const parsed = JSON.parse(String(payloadJson));
        return parsed && typeof parsed === 'object' ? parsed as PlainRecord : {};
    } catch {
        return {};
    }
}

export function serializePayload(payload: unknown): string {
    return JSON.stringify(payload && typeof payload === 'object' ? payload : {});
}

export function normalizePayload(payload: unknown): PlainRecord {
    return payload && typeof payload === 'object' ? payload as PlainRecord : {};
}

export async function ensureProfile(transaction?: Transaction): Promise<PlainRecord> {
    let profile = await MaterialCatalogRepository.findProfileByCode(PROFILE_CODE, transaction);
    if (profile) return profile;

    profile = await MaterialCatalogRepository.createProfile({
        profile_code: PROFILE_CODE,
        display_name: PROFILE_NAME,
        status: 'active',
        active_revision: null
    }, transaction);
    return profile;
}

export async function seedFromLegacyIfNeeded(transaction?: Transaction): Promise<{ profile: PlainRecord; seeded: boolean }> {
    const profile = await ensureProfile(transaction);
    const latest = await MaterialCatalogRepository.findLatestRevision(profile.id, transaction);
    if (latest) return { profile, seeded: false };

    const legacyPayload = normalizePayload(MaterialCatalogRepository.readLegacyCatalog());
    const seededRevision = await MaterialCatalogRepository.createRevision({
        profile_id: profile.id,
        revision: 1,
        state: 'published',
        payload_json: serializePayload(legacyPayload),
        change_note: 'seed from legacy file',
        created_by: 'system-admin'
    }, transaction);

    await MaterialCatalogRepository.updateProfile(profile.id, {
        status: 'active',
        active_revision: seededRevision.revision
    }, transaction);

    await MaterialCatalogRepository.createAuditLog({
        profile_id: profile.id,
        action: AUDIT_ACTIONS.SEED_LEGACY,
        from_revision: null,
        to_revision: seededRevision.revision,
        operator: 'system-admin',
        meta_json: serializePayload({ source: 'legacy-file' })
    }, transaction);

    return { profile, seeded: true };
}

export function toRevisionMeta(revision?: PlainRecord | null): PlainRecord | null {
    return revision ? {
        revision: revision.revision,
        state: revision.state,
        changeNote: revision.change_note || '',
        createdBy: revision.created_by,
        createdAt: revision.created_at
    } : null;
}

export function toAuditLog(log: PlainRecord): PlainRecord {
    return {
        id: log.id,
        action: log.action,
        fromRevision: log.from_revision,
        toRevision: log.to_revision,
        operator: log.operator,
        meta: parsePayload(log.meta_json),
        createdAt: log.created_at
    };
}

export async function getPublishedMaterialsCatalog(): Promise<PlainRecord> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const published = await MaterialCatalogRepository.findPublishedRevision(profile.id, transaction);
        if (!published) {
            return normalizePayload(MaterialCatalogRepository.readLegacyCatalog());
        }
        return parsePayload(published.payload_json);
    });
}

export async function getMaterialsCatalogDetail(): Promise<PlainRecord> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const latest = await MaterialCatalogRepository.findLatestRevision(profile.id, transaction);
        const draft = await MaterialCatalogRepository.findDraftRevision(profile.id, transaction);
        const published = await MaterialCatalogRepository.findPublishedRevision(profile.id, transaction);

        return {
            profile: {
                profileCode: profile.profile_code,
                displayName: profile.display_name,
                status: profile.status,
                activeRevision: profile.active_revision
            },
            latestRevision: toRevisionMeta(latest),
            draftRevision: toRevisionMeta(draft),
            publishedRevision: toRevisionMeta(published),
            draftPayload: draft ? parsePayload(draft.payload_json) : null,
            publishedPayload: published ? parsePayload(published.payload_json) : null
        };
    });
}

export async function updateDraft({ revision, payload, changeNote, operator }: DraftParams): Promise<PlainRecord> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const latest = await MaterialCatalogRepository.findLatestRevision(profile.id, transaction);
        const expectedRevision = revision === undefined || revision === null ? null : Number(revision);

        if (latest) {
            if (!Number.isInteger(expectedRevision) || Number(latest.revision) !== expectedRevision) {
                return {
                    ok: false,
                    status: 409,
                    errors: [{ field: 'revision', message: '版本冲突，请刷新后重试' }],
                    latestRevision: latest.revision
                };
            }
        } else if (expectedRevision !== null && expectedRevision !== 0) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'revision', message: '版本冲突，请刷新后重试' }],
                latestRevision: null
            };
        }

        const nextRevisionNumber = latest ? latest.revision + 1 : 1;
        await MaterialCatalogRepository.updateRevisionStates(profile.id, 'draft', 'archived', transaction);

        const nextRevision = await MaterialCatalogRepository.createRevision({
            profile_id: profile.id,
            revision: nextRevisionNumber,
            state: 'draft',
            payload_json: serializePayload(normalizePayload(payload)),
            change_note: changeNote || (latest ? '更新草稿' : '初始化草稿'),
            created_by: operator || 'system-admin'
        }, transaction);

        await MaterialCatalogRepository.createAuditLog({
            profile_id: profile.id,
            action: latest ? AUDIT_ACTIONS.UPDATE_DRAFT : AUDIT_ACTIONS.CREATE_DRAFT,
            from_revision: latest ? latest.revision : null,
            to_revision: nextRevisionNumber,
            operator: operator || 'system-admin',
            meta_json: serializePayload({
                changeNote: changeNote || '',
                mode: latest ? 'update' : 'init'
            })
        }, transaction);

        return {
            ok: true,
            revision: toRevisionMeta(nextRevision)
        };
    });
}

export async function publish({ fromRevision, changeNote, operator }: PublishParams): Promise<PlainRecord> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const draft = await MaterialCatalogRepository.findDraftRevision(profile.id, transaction);
        if (!draft) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'fromRevision', message: '当前没有可发布的 draft' }]
            };
        }

        if (Number(draft.revision) !== Number(fromRevision)) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'fromRevision', message: '只能发布当前 draft revision' }],
                latestRevision: draft.revision
            };
        }

        const latest = await MaterialCatalogRepository.findLatestRevision(profile.id, transaction);
        const nextRevisionNumber = (latest?.revision || 0) + 1;

        await MaterialCatalogRepository.updateRevisionStates(profile.id, 'published', 'archived', transaction);
        await MaterialCatalogRepository.updateRevisionStates(profile.id, 'draft', 'archived', transaction);

        const publishedRevision = await MaterialCatalogRepository.createRevision({
            profile_id: profile.id,
            revision: nextRevisionNumber,
            state: 'published',
            payload_json: draft.payload_json,
            change_note: changeNote || '发布版本',
            created_by: operator || 'system-admin'
        }, transaction);

        await MaterialCatalogRepository.updateProfile(profile.id, {
            status: 'active',
            active_revision: nextRevisionNumber
        }, transaction);

        const publishedPayload = parsePayload(publishedRevision.payload_json);
        MaterialCatalogRepository.writeLegacyCatalog(publishedPayload);

        await MaterialCatalogRepository.createAuditLog({
            profile_id: profile.id,
            action: AUDIT_ACTIONS.PUBLISH,
            from_revision: draft.revision,
            to_revision: nextRevisionNumber,
            operator: operator || 'system-admin',
            meta_json: serializePayload({
                changeNote: changeNote || '',
                legacySync: true
            })
        }, transaction);

        return {
            ok: true,
            revision: toRevisionMeta(publishedRevision)
        };
    });
}

export async function saveAndPublishLegacyCompatible(payload: PlainRecord, req?: PlainRecord): Promise<PlainRecord> {
    const detail = await getMaterialsCatalogDetail();
    const draftResult = await updateDraft({
        revision: detail.latestRevision ? detail.latestRevision.revision : 0,
        payload,
        changeNote: 'legacy /api/config/materials save',
        operator: operatorFromRequest(req)
    });
    if (!draftResult.ok) return draftResult;

    return publish({
        fromRevision: draftResult.revision.revision,
        changeNote: 'legacy /api/config/materials publish',
        operator: operatorFromRequest(req)
    });
}

export async function listRevisions(): Promise<PlainRecord[]> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const revisions = await MaterialCatalogRepository.listRevisions(profile.id, transaction);
        return revisions.map(toRevisionMeta).filter(Boolean) as PlainRecord[];
    });
}

export async function listAuditLogs(): Promise<PlainRecord[]> {
    return MaterialCatalogRepository.withTransaction(async (transaction: Transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const logs = await MaterialCatalogRepository.listAuditLogs(profile.id, transaction);
        return logs.map(toAuditLog);
    });
}

