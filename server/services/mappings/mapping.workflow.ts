import type { Transaction } from 'sequelize';
import fs from 'fs';
import MappingRepository from './mapping.repository';
import { AUDIT_ACTIONS, PROFILE_STATUSES, REVISION_STATES, SCHEMA_VERSION, getProfileDisplayName } from './mapping.constants';
import { parsePayload, serializePayload, validateMappingPayload, validateProfileCode } from './mapping.validator';
import { toDetail, toRevisionMeta, toSummary, toAuditLog } from './mapping.mapper';
import type { PlainRecord } from '../../shared/types';

interface WorkflowIssue {
    path: string;
    code: string;
    message: string;
}

interface WorkflowErrorItem {
    field: string;
    code: string;
    message: string;
}

interface DraftParams {
    revision?: number | string | null;
    payload: PlainRecord;
    changeNote?: string;
    operator?: string;
    schemaVersion?: number | string | null;
}

interface PublishParams {
    fromRevision: number | string;
    changeNote?: string;
    operator?: string;
}

interface RollbackParams {
    targetRevision: number | string;
    reason?: string;
    operator?: string;
}

interface EnsurePublishedParams {
    legacyPayload?: PlainRecord | null;
    operator?: string;
    changeNote?: string;
}

export function operatorFromRequest(req?: PlainRecord): string {
    const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
    return String(fromHeader || 'system-admin');
}

export function toWorkflowErrors(issues: WorkflowIssue[]): WorkflowErrorItem[] {
    return issues.map((issue) => ({
        field: issue.path,
        code: issue.code,
        message: issue.message
    }));
}

export function normalizeProfileCode(profileCode: unknown): string {
    return String(profileCode || '').trim();
}

export function normalizeSchemaVersion(input: unknown): number {
    const parsed = Number(input);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : SCHEMA_VERSION;
}

export async function ensureProfile(profileCode: unknown, transaction?: Transaction): Promise<PlainRecord> {
    const normalizedProfileCode = normalizeProfileCode(profileCode);
    let profile = await MappingRepository.findProfileByCode(normalizedProfileCode, transaction);
    if (profile) return profile;

    profile = await MappingRepository.createProfile({
        profile_code: normalizedProfileCode as any,
        display_name: getProfileDisplayName(normalizedProfileCode),
        status: PROFILE_STATUSES.ACTIVE,
        active_revision: null
    }, transaction);

    return profile;
}

export async function listMappings(): Promise<PlainRecord[]> {
    const profiles = await MappingRepository.listProfiles();
    return profiles.map(toSummary);
}

export async function getMappingDetail(profileCode: unknown): Promise<PlainRecord | null> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    const normalizedProfileCode = normalizeProfileCode(profileCode);
    const profile = await MappingRepository.findProfileByCode(normalizedProfileCode);
    if (!profile) return null;

    const latestRevision = await MappingRepository.findLatestRevisionByProfileId(profile.id);
    const draftRevision = await MappingRepository.findDraftRevisionByProfileId(profile.id);
    const publishedRevision = await MappingRepository.findPublishedRevisionByProfileId(profile.id);

    return {
        ok: true,
        mapping: toDetail(profile, {
            latestRevision,
            draftRevision,
            publishedRevision,
            draftPayload: draftRevision ? parsePayload(draftRevision.payload_json) : null,
            publishedPayload: publishedRevision ? parsePayload(publishedRevision.payload_json) : null
        })
    };
}

export async function updateDraft(profileCode: unknown, {
    revision,
    payload,
    changeNote,
    operator,
    schemaVersion
}: DraftParams): Promise<PlainRecord> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    const payloadIssues = validateMappingPayload(profileCode, payload);
    if (payloadIssues.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(payloadIssues) };
    }

    return MappingRepository.withTransaction(async (transaction: Transaction) => {
        const normalizedProfileCode = normalizeProfileCode(profileCode);
        const profile = await ensureProfile(normalizedProfileCode, transaction);
        const latestRevision = await MappingRepository.findLatestRevisionByProfileId(profile.id, transaction);
        const expectedRevision = revision === undefined || revision === null ? null : Number(revision);

        if (latestRevision) {
            if (!Number.isInteger(expectedRevision) || Number(latestRevision.revision) !== expectedRevision) {
                return {
                    ok: false,
                    status: 409,
                    errors: [{
                        field: 'revision',
                        code: 'revision-conflict',
                        message: '版本冲突，请刷新后重试'
                    }],
                    latestRevision: latestRevision.revision
                };
            }
        } else if (expectedRevision !== null && Number(expectedRevision) !== 0) {
            return {
                ok: false,
                status: 409,
                errors: [{
                    field: 'revision',
                    code: 'revision-conflict',
                    message: '版本冲突，请刷新后重试'
                }],
                latestRevision: null
            };
        }

        const nextRevisionNumber = latestRevision ? latestRevision.revision + 1 : 1;
        await MappingRepository.updateRevisionStates(profile.id, REVISION_STATES.DRAFT, REVISION_STATES.ARCHIVED, transaction);

        const nextRevision = await MappingRepository.createRevision({
            profile_id: profile.id,
            revision: nextRevisionNumber,
            state: REVISION_STATES.DRAFT,
            schema_version: normalizeSchemaVersion(schemaVersion),
            payload_json: serializePayload(payload),
            change_note: changeNote || (latestRevision ? '更新草稿' : '初始化草稿'),
            created_by: operator || 'system-admin'
        }, transaction);

        await MappingRepository.updateProfile(profile.id, {
            status: PROFILE_STATUSES.ACTIVE
        }, transaction);

        await MappingRepository.createAuditLog({
            profile_id: profile.id,
            action: latestRevision ? AUDIT_ACTIONS.UPDATE_DRAFT : AUDIT_ACTIONS.CREATE_DRAFT,
            from_revision: latestRevision ? latestRevision.revision : null,
            to_revision: nextRevisionNumber,
            operator: operator || 'system-admin',
            meta_json: JSON.stringify({
                changeNote: changeNote || '',
                schemaVersion: normalizeSchemaVersion(schemaVersion)
            })
        }, transaction);

        return {
            ok: true,
            profile: toSummary(profile),
            revision: toRevisionMeta(nextRevision)
        };
    });
}

export async function publish(profileCode: unknown, {
    fromRevision,
    changeNote,
    operator
}: PublishParams): Promise<PlainRecord> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    return MappingRepository.withTransaction(async (transaction: Transaction) => {
        const normalizedProfileCode = normalizeProfileCode(profileCode);
        const profile = await MappingRepository.findProfileByCode(normalizedProfileCode, transaction);
        if (!profile) {
            return {
                ok: false,
                status: 404,
                errors: [{ field: 'profileCode', code: 'not-found', message: 'mapping profile 不存在' }]
            };
        }

        const draftRevision = await MappingRepository.findDraftRevisionByProfileId(profile.id, transaction);
        if (!draftRevision) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'fromRevision', code: 'missing-draft', message: '当前没有可发布的 draft' }]
            };
        }

        if (Number(draftRevision.revision) !== Number(fromRevision)) {
            return {
                ok: false,
                status: 409,
                errors: [{ field: 'fromRevision', code: 'revision-conflict', message: '只能发布当前 draft revision' }],
                latestRevision: draftRevision.revision
            };
        }

        const payload = parsePayload(draftRevision.payload_json);
        const payloadIssues = validateMappingPayload(normalizedProfileCode, payload);
        if (payloadIssues.length > 0) {
            return { ok: false, status: 422, errors: toWorkflowErrors(payloadIssues) };
        }

        const latestRevision = await MappingRepository.findLatestRevisionByProfileId(profile.id, transaction);
        const nextRevisionNumber = (latestRevision?.revision || 0) + 1;

        await MappingRepository.updateRevisionStates(profile.id, REVISION_STATES.PUBLISHED, REVISION_STATES.ARCHIVED, transaction);
        await MappingRepository.updateRevisionStates(profile.id, REVISION_STATES.DRAFT, REVISION_STATES.ARCHIVED, transaction);

        const publishedRevision = await MappingRepository.createRevision({
            profile_id: profile.id,
            revision: nextRevisionNumber,
            state: REVISION_STATES.PUBLISHED,
            schema_version: draftRevision.schema_version || SCHEMA_VERSION,
            payload_json: draftRevision.payload_json,
            change_note: changeNote || '发布版本',
            created_by: operator || 'system-admin'
        }, transaction);

        await MappingRepository.updateProfile(profile.id, {
            status: PROFILE_STATUSES.ACTIVE,
            active_revision: nextRevisionNumber
        }, transaction);

        await MappingRepository.createAuditLog({
            profile_id: profile.id,
            action: AUDIT_ACTIONS.PUBLISH,
            from_revision: draftRevision.revision,
            to_revision: nextRevisionNumber,
            operator: operator || 'system-admin',
            meta_json: JSON.stringify({ changeNote: changeNote || '' })
        }, transaction);

        return {
            ok: true,
            revision: toRevisionMeta(publishedRevision)
        };
    });
}

export async function rollback(profileCode: unknown, {
    targetRevision,
    reason,
    operator
}: RollbackParams): Promise<PlainRecord> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    return MappingRepository.withTransaction(async (transaction: Transaction) => {
        const normalizedProfileCode = normalizeProfileCode(profileCode);
        const profile = await MappingRepository.findProfileByCode(normalizedProfileCode, transaction);
        if (!profile) {
            return {
                ok: false,
                status: 404,
                errors: [{ field: 'profileCode', code: 'not-found', message: 'mapping profile 不存在' }]
            };
        }

        const sourceRevision = await MappingRepository.findRevisionByProfileIdAndRevision(profile.id, targetRevision, transaction);
        if (!sourceRevision) {
            return {
                ok: false,
                status: 404,
                errors: [{ field: 'targetRevision', code: 'not-found', message: '回滚目标 revision 不存在' }]
            };
        }

        const latestRevision = await MappingRepository.findLatestRevisionByProfileId(profile.id, transaction);
        const nextRevisionNumber = (latestRevision?.revision || 0) + 1;

        await MappingRepository.updateRevisionStates(profile.id, REVISION_STATES.DRAFT, REVISION_STATES.ARCHIVED, transaction);

        const rollbackDraft = await MappingRepository.createRevision({
            profile_id: profile.id,
            revision: nextRevisionNumber,
            state: REVISION_STATES.DRAFT,
            schema_version: sourceRevision.schema_version || SCHEMA_VERSION,
            payload_json: sourceRevision.payload_json,
            change_note: reason ? `rollback:${reason}` : 'rollback draft',
            created_by: operator || 'system-admin'
        }, transaction);

        await MappingRepository.updateProfile(profile.id, {
            status: PROFILE_STATUSES.ACTIVE
        }, transaction);

        await MappingRepository.createAuditLog({
            profile_id: profile.id,
            action: AUDIT_ACTIONS.ROLLBACK,
            from_revision: profile.active_revision,
            to_revision: nextRevisionNumber,
            operator: operator || 'system-admin',
            meta_json: JSON.stringify({
                reason: reason || '',
                targetRevision: Number(targetRevision),
                mode: 'draft_copy'
            })
        }, transaction);

        return {
            ok: true,
            revision: toRevisionMeta(rollbackDraft),
            activeRevision: profile.active_revision
        };
    });
}

export async function listRevisions(profileCode: unknown): Promise<PlainRecord | null> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    const normalizedProfileCode = normalizeProfileCode(profileCode);
    const profile = await MappingRepository.findProfileByCode(normalizedProfileCode);
    if (!profile) return null;

    const revisions = await MappingRepository.listRevisionsByProfileId(profile.id);
    return {
        ok: true,
        revisions: revisions.map(toRevisionMeta)
    };
}

export async function listAuditLogs(profileCode: unknown): Promise<PlainRecord | null> {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    const normalizedProfileCode = normalizeProfileCode(profileCode);
    const profile = await MappingRepository.findProfileByCode(normalizedProfileCode);
    if (!profile) return null;

    const logs = await MappingRepository.listAuditLogsByProfileId(profile.id);
    return {
        ok: true,
        items: logs.map(toAuditLog)
    };
}

export async function getPublishedMapping(profileCode: unknown): Promise<PlainRecord | null> {
    const detail = await getMappingDetail(profileCode);
    if (!detail) return null;
    if (!detail.ok) return detail;
    return {
        ok: true,
        payload: detail.mapping.publishedPayload
    };
}

export async function seedFromLegacyPayload(
    profileCode: unknown,
    payload: PlainRecord,
    { operator, changeNote }: { operator?: string; changeNote?: string } = {},
): Promise<PlainRecord> {
    const draft = await updateDraft(profileCode, {
        revision: 0,
        payload,
        changeNote: changeNote || 'seed from legacy runtime',
        operator: operator || 'system-admin'
    });
    if (!draft.ok) return draft;

    return publish(profileCode, {
        fromRevision: draft.revision.revision,
        changeNote: changeNote || 'publish legacy runtime seed',
        operator: operator || 'system-admin'
    });
}

export async function ensurePublishedMapping(
    profileCode: unknown,
    { legacyPayload, operator, changeNote }: EnsurePublishedParams = {},
): Promise<PlainRecord | null> {
    const published = await getPublishedMapping(profileCode);
    if (published && published.ok && published.payload) {
        return published;
    }
    if (!legacyPayload) {
        return published || null;
    }

    const seeded = await seedFromLegacyPayload(profileCode, legacyPayload, {
        operator,
        changeNote
    });
    if (!seeded || !seeded.ok) return seeded;

    return getPublishedMapping(profileCode);
}

export function syncLegacyRuntimeFile(runtimeFile: string | undefined, payload: PlainRecord): void {
    if (!runtimeFile) return;
    const tempPath = `${runtimeFile}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 4));
    fs.renameSync(tempPath, runtimeFile);
}

