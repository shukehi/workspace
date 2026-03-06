function toSummary(profile) {
    return {
        id: profile.id,
        profileCode: profile.profile_code,
        displayName: profile.display_name,
        status: profile.status,
        activeRevision: profile.active_revision,
        updatedAt: profile.updated_at
    };
}

function toRevisionMeta(revision) {
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

function toDetail(profile, options = {}) {
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

module.exports = {
    toSummary,
    toRevisionMeta,
    toDetail
};
