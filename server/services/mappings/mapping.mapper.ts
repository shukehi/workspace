export {};

type PlainRecord = Record<string, any>;

function toSummary(profile: PlainRecord) {
    return {
        id: profile.id,
        profileCode: profile.profile_code,
        displayName: profile.display_name,
        status: profile.status,
        activeRevision: profile.active_revision,
        updatedAt: profile.updated_at
    };
}

function toRevisionMeta(revision: PlainRecord) {
    return {
        id: revision.id,
        revision: revision.revision,
        state: revision.state,
        schemaVersion: revision.schema_version,
        changeNote: revision.change_note,
        createdBy: revision.created_by,
        createdAt: revision.created_at
    };
}

function toDetail(profile: PlainRecord, options: PlainRecord = {}) {
    const {
        latestRevision = null,
        draftRevision = null,
        publishedRevision = null,
        draftPayload = null,
        publishedPayload = null
    } = options;

    return {
        ...toSummary(profile),
        latestRevision: latestRevision ? toRevisionMeta(latestRevision) : null,
        draftRevision: draftRevision ? toRevisionMeta(draftRevision) : null,
        publishedRevision: publishedRevision ? toRevisionMeta(publishedRevision) : null,
        draftPayload,
        publishedPayload
    };
}

function toAuditLog(log: PlainRecord) {
    let meta: PlainRecord = {};
    try {
        meta = log.meta_json ? JSON.parse(log.meta_json) : {};
    } catch {
        meta = {};
    }

    return {
        id: log.id,
        action: log.action,
        fromRevision: log.from_revision,
        toRevision: log.to_revision,
        operator: log.operator,
        meta,
        createdAt: log.created_at
    };
}

module.exports = {
    toSummary,
    toRevisionMeta,
    toDetail,
    toAuditLog
};
