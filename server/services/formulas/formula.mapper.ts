export {};

type PlainRecord = Record<string, any>;

function toRevisionMeta(revision: PlainRecord) {
    return {
        id: revision.id,
        revision: revision.revision,
        state: revision.state,
        changeNote: revision.change_note,
        createdBy: revision.created_by,
        createdAt: revision.created_at
    };
}

function toSummary(definition: PlainRecord) {
    return {
        id: definition.id,
        formulaKey: definition.formula_key,
        displayName: definition.display_name,
        status: definition.status,
        activeRevision: definition.active_revision,
        updatedAt: definition.updated_at
    };
}

function toDetail(definition: PlainRecord, payload: { bom: unknown[] }) {
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

function toPublishedMap(
    definitions: PlainRecord[],
    latestPublishedByFormulaId: Map<number, PlainRecord>,
    parsePayload: (payloadJson: string) => PlainRecord,
) {
    const mapping: Record<string, { displayName: string; bom: unknown[] }> = {};
    for (const definition of definitions) {
        const revision = latestPublishedByFormulaId.get(definition.id);
        if (!revision) continue;
        const payload = parsePayload(revision.payload_json);
        const displayName = String(payload.displayName || definition.display_name || '').trim();
        const record = {
            displayName,
            bom: payload.bom
        };
        mapping[definition.formula_key] = record;
        if (displayName && !mapping[displayName]) {
            mapping[displayName] = record;
        }
    }
    return mapping;
}

module.exports = {
    toRevisionMeta,
    toSummary,
    toDetail,
    toPublishedMap
};
