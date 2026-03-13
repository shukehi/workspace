function normalizeKeyPart(value) {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function buildOrderItemKey(item = {}) {
    return [
        normalizeKeyPart(item.material_id),
        normalizeKeyPart(item.name || item.type),
        normalizeKeyPart(item.spec || item.model)
    ].join('|');
}

function buildLegacyOrderItemKey(item = {}) {
    return [
        '',
        normalizeKeyPart(item.name || item.type),
        normalizeKeyPart(item.spec || item.model)
    ].join('|');
}

module.exports = {
    buildOrderItemKey,
    buildLegacyOrderItemKey
};
