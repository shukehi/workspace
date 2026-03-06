const DEFAULT_PACKAGING_SUPPLIER = '方亮包装';
const DEFAULT_LOCK_FORK_HEIGHT_REFERENCE = 2050;
const DEFAULT_LOCK_FORK_HANGING_FEET = 35;

function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toTrimmedString(value) {
    if (typeof value === 'string') return value.trim();
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function toFiniteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function hasCanonicalPackagingShape(value) {
    return Object.prototype.hasOwnProperty.call(value, 'mappings')
        || Object.prototype.hasOwnProperty.call(value, 'supplierName');
}

function adaptStringList(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => toTrimmedString(item)).filter(Boolean);
}

function adaptCylinderVariant(value) {
    const record = asRecord(value);
    const code = toTrimmedString(record.code);
    const eccentricity = toTrimmedString(record.eccentricity);
    const remark = toTrimmedString(record.remark);

    if (!code && !eccentricity && !remark) return null;

    return {
        code,
        eccentricity,
        ...(remark ? { remark } : {})
    };
}

function adaptCylinderVariantMap(value) {
    const record = asRecord(value);
    const variants = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const variant = adaptCylinderVariant(rawValue);
        if (!key || !variant) return;
        variants[key] = variant;
    });

    return variants;
}

function adaptCylinderDimensionRule(value) {
    const direct = adaptCylinderVariant(value);
    const record = asRecord(value);
    const variants = adaptCylinderVariantMap(record.variants);

    if (!direct && Object.keys(variants).length === 0) return null;

    return {
        code: direct?.code || '',
        eccentricity: direct?.eccentricity || '',
        ...(direct?.remark ? { remark: direct.remark } : {}),
        ...(Object.keys(variants).length > 0 ? { variants } : {})
    };
}

function adaptCylinderDimensionMap(value) {
    const record = asRecord(value);
    const dimensions = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const dimension = adaptCylinderDimensionRule(rawValue);
        if (!key || !dimension) return;
        dimensions[key] = dimension;
    });

    return dimensions;
}

function adaptCylinderSpecialRule(value) {
    const record = asRecord(value);
    const conditionField = toTrimmedString(record.conditionField);
    const keyword = toTrimmedString(record.keyword);
    const thickness = toTrimmedString(record.thickness);
    const variants = adaptCylinderVariantMap(record.variants);

    if (!conditionField && !keyword && !thickness && Object.keys(variants).length === 0) return null;

    return {
        conditionField,
        keyword,
        thickness,
        variants
    };
}

function adaptCylinderSpecialRules(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => adaptCylinderSpecialRule(item)).filter(Boolean);
}

function adaptCylinderMappingEntry(value) {
    const record = asRecord(value);
    const supplier = toTrimmedString(record.supplier);
    const template = toTrimmedString(record.template);

    if (!supplier && !template) return null;

    return { supplier, template };
}

function adaptCylinderMappings(value) {
    const record = asRecord(value);
    const mappings = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const mapping = adaptCylinderMappingEntry(rawValue);
        if (!key || !mapping) return;
        mappings[key] = mapping;
    });

    return mappings;
}

function adaptLockForkDimensionPair(value) {
    const record = asRecord(value);
    const base1 = toFiniteNumber(record.base1, NaN);
    const base2 = toFiniteNumber(record.base2, NaN);

    if (!Number.isFinite(base1) && !Number.isFinite(base2)) return null;

    return {
        base1: Number.isFinite(base1) ? base1 : 0,
        base2: Number.isFinite(base2) ? base2 : 0
    };
}

function adaptLockForkDimensionGroup(value) {
    const record = asRecord(value);
    const upper = adaptLockForkDimensionPair(record.upper);
    const lower = adaptLockForkDimensionPair(record.lower);

    if (!upper || !lower) return null;
    return { upper, lower };
}

function adaptLockForkBaseDimensionRule(value) {
    const record = asRecord(value);
    const standard = adaptLockForkDimensionGroup(record.standard);
    const withHangingFeet = adaptLockForkDimensionGroup(record.withHangingFeet);

    if (!standard && !withHangingFeet) return null;

    return {
        ...(standard ? { standard } : {}),
        ...(withHangingFeet ? { withHangingFeet } : {})
    };
}

function adaptLockForkBaseDimensions(value) {
    const record = asRecord(value);
    const baseDimensions = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const dimension = adaptLockForkBaseDimensionRule(rawValue);
        if (!key || !dimension) return;
        baseDimensions[key] = dimension;
    });

    return baseDimensions;
}

function adaptLockForkTypeConfig(value) {
    const record = asRecord(value);
    const category = toTrimmedString(record.category);
    const nameModifier = toTrimmedString(record.nameModifier);
    const upper = toTrimmedString(record.upper);
    const lower = toTrimmedString(record.lower);

    if (!category && !nameModifier && !upper && !lower) return null;

    return {
        ...(category ? { category } : {}),
        ...(nameModifier ? { nameModifier } : {}),
        ...(upper ? { upper } : {}),
        ...(lower ? { lower } : {})
    };
}

function adaptLockForkEdgeTypeConfig(value) {
    const record = asRecord(value);
    const nameModifier = toTrimmedString(record.nameModifier);
    if (!nameModifier) return null;
    return { nameModifier };
}

function adaptLockForkTypeMap(value, adapter) {
    const record = asRecord(value);
    const result = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const adapted = adapter(rawValue);
        if (!key || !adapted) return;
        result[key] = adapted;
    });

    return result;
}

function adaptSuppliers(value) {
    const record = asRecord(value);
    const suppliers = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const supplier = toTrimmedString(rawValue);
        if (!key || !supplier) return;
        suppliers[key] = supplier;
    });

    return suppliers;
}

function adaptPackagingMapping(value) {
    const record = asRecord(value);
    const canonical = hasCanonicalPackagingShape(record);
    const mappingSource = canonical ? asRecord(record.mappings) : record;
    const mappings = {};

    Object.entries(mappingSource).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const mapped = toTrimmedString(rawValue);
        if (!key || !mapped) return;
        mappings[key] = mapped;
    });

    return {
        supplierName: canonical ? (toTrimmedString(record.supplierName) || DEFAULT_PACKAGING_SUPPLIER) : DEFAULT_PACKAGING_SUPPLIER,
        mappings
    };
}

function adaptCylinderMapping(value) {
    const record = asRecord(value);
    return {
        dimensions: adaptCylinderDimensionMap(record.dimensions),
        specialRules: adaptCylinderSpecialRules(record.specialRules),
        secondaryDimensions: adaptCylinderDimensionMap(record.secondaryDimensions),
        secondarySpecialRules: adaptCylinderSpecialRules(record.secondarySpecialRules),
        mappings: adaptCylinderMappings(record.mappings),
        customLogos: adaptStringList(record.customLogos)
    };
}

function adaptLockForkMapping(value) {
    const record = asRecord(value);
    return {
        baseDimensions: adaptLockForkBaseDimensions(record.baseDimensions),
        lockTypes: adaptLockForkTypeMap(record.lockTypes, adaptLockForkTypeConfig),
        edgeTypes: adaptLockForkTypeMap(record.edgeTypes, adaptLockForkEdgeTypeConfig),
        hangingFeet: {
            standard: toFiniteNumber(record.hangingFeet?.standard, DEFAULT_LOCK_FORK_HANGING_FEET),
            keywords: (() => {
                const keywords = adaptStringList(record.hangingFeet?.keywords);
                return keywords.length > 0 ? keywords : ['吊脚', 'diaojiao'];
            })()
        },
        heightReference: toFiniteNumber(record.heightReference, DEFAULT_LOCK_FORK_HEIGHT_REFERENCE),
        suppliers: adaptSuppliers(record.suppliers)
    };
}

module.exports = {
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockForkMapping
};
