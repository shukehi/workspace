const MaterialCatalogRepository = require('./materialCatalog.repository');

const PROFILE_CODE = 'materials';
const PROFILE_NAME = 'Materials Catalog';

function operatorFromRequest(req) {
    const fromHeader = req?.headers?.['x-operator'] || req?.headers?.['x-user'];
    return String(fromHeader || 'system-admin');
}

function parsePayload(payloadJson) {
    if (!payloadJson) return {};
    try {
        const parsed = JSON.parse(payloadJson);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function serializePayload(payload) {
    return JSON.stringify(payload && typeof payload === 'object' ? payload : {});
}

function normalizePayload(payload) {
    return payload && typeof payload === 'object' ? payload : {};
}

async function ensureProfile(transaction) {
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

async function seedFromLegacyIfNeeded(transaction) {
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

    return { profile, seeded: true };
}

function toRevisionMeta(revision) {
    return revision ? {
        revision: revision.revision,
        state: revision.state,
        changeNote: revision.change_note || '',
        createdBy: revision.created_by,
        createdAt: revision.created_at
    } : null;
}

async function getPublishedMaterialsCatalog() {
    return MaterialCatalogRepository.withTransaction(async (transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const published = await MaterialCatalogRepository.findPublishedRevision(profile.id, transaction);
        if (!published) {
            return normalizePayload(MaterialCatalogRepository.readLegacyCatalog());
        }
        return parsePayload(published.payload_json);
    });
}

async function getMaterialsCatalogDetail() {
    return MaterialCatalogRepository.withTransaction(async (transaction) => {
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

async function updateDraft({ revision, payload, changeNote, operator }) {
    return MaterialCatalogRepository.withTransaction(async (transaction) => {
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

        return {
            ok: true,
            revision: toRevisionMeta(nextRevision)
        };
    });
}

async function publish({ fromRevision, changeNote, operator }) {
    return MaterialCatalogRepository.withTransaction(async (transaction) => {
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

        return {
            ok: true,
            revision: toRevisionMeta(publishedRevision)
        };
    });
}

async function saveAndPublishLegacyCompatible(payload, req) {
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

async function listRevisions() {
    return MaterialCatalogRepository.withTransaction(async (transaction) => {
        const { profile } = await seedFromLegacyIfNeeded(transaction);
        const revisions = await MaterialCatalogRepository.listRevisions(profile.id, transaction);
        return revisions.map(toRevisionMeta);
    });
}

module.exports = {
    operatorFromRequest,
    getPublishedMaterialsCatalog,
    getMaterialsCatalogDetail,
    updateDraft,
    publish,
    saveAndPublishLegacyCompatible,
    listRevisions
};
