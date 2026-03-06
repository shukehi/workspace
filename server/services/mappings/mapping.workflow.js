const MappingRepository = require('./mapping.repository');
const {
    AUDIT_ACTIONS,
    PROFILE_STATUSES,
    REVISION_STATES,
    SCHEMA_VERSION,
    getProfileDisplayName
} = require('./mapping.constants');
const {
    parsePayload,
    serializePayload,
    validateMappingPayload,
    validateProfileCode
} = require('./mapping.validator');
const {
    toDetail,
    toRevisionMeta,
    toSummary
} = require('./mapping.mapper');

function operatorFromRequest(req) {
    const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
    return String(fromHeader || 'system-admin');
}

function toWorkflowErrors(issues) {
    return issues.map((issue) => ({
        field: issue.path,
        code: issue.code,
        message: issue.message
    }));
}

function normalizeProfileCode(profileCode) {
    return String(profileCode || '').trim();
}

function normalizeSchemaVersion(input) {
    const parsed = Number(input);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : SCHEMA_VERSION;
}

async function ensureProfile(profileCode, transaction) {
    const normalizedProfileCode = normalizeProfileCode(profileCode);
    let profile = await MappingRepository.findProfileByCode(normalizedProfileCode, transaction);
    if (profile) return profile;

    profile = await MappingRepository.createProfile({
        profile_code: normalizedProfileCode,
        display_name: getProfileDisplayName(normalizedProfileCode),
        status: PROFILE_STATUSES.ACTIVE,
        active_revision: null
    }, transaction);

    return profile;
}

async function listMappings() {
    const profiles = await MappingRepository.listProfiles();
    return profiles.map(toSummary);
}

async function getMappingDetail(profileCode) {
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

async function updateDraft(profileCode, {
    revision,
    payload,
    changeNote,
    operator,
    schemaVersion
}) {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    const payloadIssues = validateMappingPayload(profileCode, payload);
    if (payloadIssues.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(payloadIssues) };
    }

    return MappingRepository.withTransaction(async (transaction) => {
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

async function publish(profileCode, {
    fromRevision,
    changeNote,
    operator
}) {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    return MappingRepository.withTransaction(async (transaction) => {
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

async function rollback(profileCode, {
    targetRevision,
    reason,
    operator
}) {
    const profileCodeErrors = validateProfileCode(profileCode);
    if (profileCodeErrors.length > 0) {
        return { ok: false, status: 422, errors: toWorkflowErrors(profileCodeErrors) };
    }

    return MappingRepository.withTransaction(async (transaction) => {
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

async function listRevisions(profileCode) {
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

module.exports = {
    operatorFromRequest,
    toRevisionMeta,
    listMappings,
    getMappingDetail,
    updateDraft,
    publish,
    rollback,
    listRevisions
};
