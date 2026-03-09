const DEFAULT_PACKAGING_SUPPLIER = '方亮包装';
const DEFAULT_LOCK_FORK_HEIGHT_REFERENCE = 2050;
const DEFAULT_LOCK_FORK_HANGING_FEET = 35;
const DEFAULT_CYLINDER_EXCLUDED = ['指纹锁配套锁芯'];
const DEFAULT_HANDLE_SUPPLIER = '拉手供应商';
const DEFAULT_HANDLE_UNMATCHED_SUPPLIER = '待人工处理';
const DEFAULT_HANDLE_MANUAL_REVIEW_LABEL = '未匹配拉手(待人工处理)';
const DEFAULT_HANDLE_SINGLE_KEYWORDS = ['单活'];
const DEFAULT_HANDLE_DOUBLE_KEYWORDS = ['双活'];
const DEFAULT_HANDLE_EXPORT_CUSTOMER_KEYWORDS = ['三部'];
const DEFAULT_HANDLE_EXPORT_ACTIVITY = 'double';
const DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS = ['冲整体拉手孔', '拉手孔', '开拉手孔', '开孔', '打孔'];
const DEFAULT_HANDLE_FALLBACK_SOURCES = ['remark', 'xsbz'];
const DEFAULT_HANDLE_THICKNESS_PACKS = {
    '5': '5公分配件包',
    '7': '7公分配件包',
    '9': '9公分配件包',
    '10': '10公分配件包'
};

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

function adaptHandleMappingEntry(value) {
    const record = asRecord(value);
    const supplier = toTrimmedString(record.supplier);
    const vendorName = toTrimmedString(record.vendorName)
        || toTrimmedString(record.vendorNameDouble)
        || toTrimmedString(record.vendorNameSingle);
    if (!supplier && !vendorName) return null;
    return {
        supplier,
        vendorName
    };
}

function adaptHandleMappings(value) {
    const record = asRecord(value);
    const mappings = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const mapping = adaptHandleMappingEntry(rawValue);
        if (!key || !mapping) return;
        mappings[key] = mapping;
    });

    return mappings;
}

function adaptThicknessAccessoryPacks(value) {
    const record = asRecord(value);
    const packs = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const label = toTrimmedString(rawValue);
        if (!key || !label) return;
        packs[key] = label;
    });

    return packs;
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
    const hasExcludedCylinders = Object.prototype.hasOwnProperty.call(record, 'excludedCylinders');
    const excludedCylinders = adaptStringList(record.excludedCylinders);
    return {
        dimensions: adaptCylinderDimensionMap(record.dimensions),
        specialRules: adaptCylinderSpecialRules(record.specialRules),
        secondaryDimensions: adaptCylinderDimensionMap(record.secondaryDimensions),
        secondarySpecialRules: adaptCylinderSpecialRules(record.secondarySpecialRules),
        mappings: adaptCylinderMappings(record.mappings),
        customLogos: adaptStringList(record.customLogos),
        excludedCylinders: hasExcludedCylinders ? excludedCylinders : [...DEFAULT_CYLINDER_EXCLUDED]
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

function adaptHandleMapping(value) {
    const record = asRecord(value);
    const packs = adaptThicknessAccessoryPacks(record.thicknessAccessoryPacks);
    const fallbackModelSources = adaptStringList(record.fallbackModelSources)
        .filter((item) => item === 'remark' || item === 'xsbz');

    return {
        defaultSupplier: toTrimmedString(record.defaultSupplier) || DEFAULT_HANDLE_SUPPLIER,
        unmatchedSupplier: toTrimmedString(record.unmatchedSupplier) || DEFAULT_HANDLE_UNMATCHED_SUPPLIER,
        manualReviewLabel: toTrimmedString(record.manualReviewLabel) || DEFAULT_HANDLE_MANUAL_REVIEW_LABEL,
        singleKeywords: (() => {
            const keywords = adaptStringList(record.singleKeywords);
            return keywords.length > 0 ? keywords : [...DEFAULT_HANDLE_SINGLE_KEYWORDS];
        })(),
        doubleKeywords: (() => {
            const keywords = adaptStringList(record.doubleKeywords);
            return keywords.length > 0 ? keywords : [...DEFAULT_HANDLE_DOUBLE_KEYWORDS];
        })(),
        exportCustomerKeywords: (() => {
            const keywords = adaptStringList(record.exportCustomerKeywords);
            return keywords.length > 0 ? keywords : [...DEFAULT_HANDLE_EXPORT_CUSTOMER_KEYWORDS];
        })(),
        defaultActivityForExport: toTrimmedString(record.defaultActivityForExport) === 'single'
            ? 'single'
            : DEFAULT_HANDLE_EXPORT_ACTIVITY,
        placeholderKeywords: (() => {
            const keywords = adaptStringList(record.placeholderKeywords);
            return keywords.length > 0 ? keywords : [...DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS];
        })(),
        fallbackModelSources: fallbackModelSources.length > 0
            ? fallbackModelSources
            : [...DEFAULT_HANDLE_FALLBACK_SOURCES],
        thicknessAccessoryPacks: { ...DEFAULT_HANDLE_THICKNESS_PACKS, ...packs },
        mappings: adaptHandleMappings(record.mappings)
    };
}

module.exports = {
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockForkMapping,
    adaptHandleMapping
};
