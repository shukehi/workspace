function toRevisionMeta(revision) {
    return {
        id: revision.id,
        revision: revision.revision,
        state: revision.state,
        changeNote: revision.change_note,
        createdBy: revision.created_by,
        createdAt: revision.created_at
    };
}

function toSummary(definition) {
    return {
        id: definition.id,
        formulaKey: definition.formula_key,
        displayName: definition.display_name,
        status: definition.status,
        activeRevision: definition.active_revision,
        updatedAt: definition.updated_at
    };
}

function toDetail(definition, payload) {
    return {
        id: definition.id,
        formulaKey: definition.formula_key,
        displayName: definition.display_name,
        status: definition.status,
        activeRevision: definition.active_revision,
        bom: payload.bom,
        updatedAt: definition.updated_at
    };
}

function toPublishedMap(definitions, latestPublishedByFormulaId, parsePayload) {
    const mapping = {};
    for (const definition of definitions) {
        const revision = latestPublishedByFormulaId.get(definition.id);
        if (!revision) continue;
        const payload = parsePayload(revision.payload_json);
        mapping[definition.formula_key] = {
            displayName: payload.displayName || definition.display_name,
            bom: payload.bom
        };
    }
    return mapping;
}

module.exports = {
    toRevisionMeta,
    toSummary,
    toDetail,
    toPublishedMap
};
