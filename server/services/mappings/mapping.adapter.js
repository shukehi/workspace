const sharedMappingAdapterCore = require('../../../shared/mappings/mapping-adapter-core');

const {
    defaults,
    normalizeLockMappingKey,
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockForkMapping,
    adaptLockMapping
} = sharedMappingAdapterCore;

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
    const materialCode = toTrimmedString(record.materialCode)
        || toTrimmedString(record.material_id)
        || toTrimmedString(record.materialCodeSingle)
        || toTrimmedString(record.materialCodeDouble);
    if (!supplier && !vendorName) return null;
    return {
        supplier,
        vendorName,
        ...(materialCode ? { materialCode } : {})
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
    defaults,
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockMapping,
    adaptLockForkMapping,
    adaptHandleMapping,
    normalizeLockMappingKey,
    normalizePackagingMappingKey: sharedMappingAdapterCore.normalizePackagingMappingKey
};
