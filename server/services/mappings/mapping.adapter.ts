// .mjs 文件位於前端共享目錄，不在 tsconfig.server.json 範圍內，
// TypeScript 無法靜態 import，須用 require() 載入。
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharedMappingAdapterCore = require('../../../shared/mappings/mapping-adapter-core.mjs');

const {
    defaults,
    normalizeLockMappingKey,
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockForkMapping,
    adaptLockMapping
} = sharedMappingAdapterCore;

const DEFAULT_HANDLE_SUPPLIER: string = defaults.DEFAULT_HANDLE_SUPPLIER;
const DEFAULT_HANDLE_UNMATCHED_SUPPLIER: string = defaults.DEFAULT_HANDLE_UNMATCHED_SUPPLIER;
const DEFAULT_HANDLE_MANUAL_REVIEW_LABEL: string = defaults.DEFAULT_HANDLE_MANUAL_REVIEW_LABEL;
const DEFAULT_HANDLE_SINGLE_KEYWORDS: string[] = ['单活'];
const DEFAULT_HANDLE_DOUBLE_KEYWORDS: string[] = ['双活'];
const DEFAULT_HANDLE_EXPORT_CUSTOMER_KEYWORDS: string[] = ['三部'];
const DEFAULT_HANDLE_EXPORT_ACTIVITY = 'double';
const DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS: string[] = ['冲整体拉手孔', '拉手孔', '开拉手孔', '开孔', '打孔'];
const DEFAULT_HANDLE_FALLBACK_SOURCES: string[] = ['remark', 'xsbz'];
const DEFAULT_HANDLE_THICKNESS_PACKS: Record<string, string> = {
    '5': '5公分配件包',
    '7': '7公分配件包',
    '9': '9公分配件包',
    '10': '10公分配件包'
};

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toTrimmedString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function adaptStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map((item) => toTrimmedString(item)).filter(Boolean);
}

interface HandleMappingEntry {
    supplier: string;
    vendorName: string;
    materialCode?: string;
}

function adaptHandleMappingEntry(value: unknown): HandleMappingEntry | null {
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

function adaptHandleMappings(value: unknown): Record<string, HandleMappingEntry> {
    const record = asRecord(value);
    const mappings: Record<string, HandleMappingEntry> = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const mapping = adaptHandleMappingEntry(rawValue);
        if (!key || !mapping) return;
        mappings[key] = mapping;
    });

    return mappings;
}

function adaptThicknessAccessoryPacks(value: unknown): Record<string, string> {
    const record = asRecord(value);
    const packs: Record<string, string> = {};

    Object.entries(record).forEach(([rawKey, rawValue]) => {
        const key = toTrimmedString(rawKey);
        const label = toTrimmedString(rawValue);
        if (!key || !label) return;
        packs[key] = label;
    });

    return packs;
}

export interface HandleMappingResult {
    defaultSupplier: string;
    unmatchedSupplier: string;
    manualReviewLabel: string;
    singleKeywords: string[];
    doubleKeywords: string[];
    exportCustomerKeywords: string[];
    defaultActivityForExport: string;
    placeholderKeywords: string[];
    fallbackModelSources: string[];
    thicknessAccessoryPacks: Record<string, string>;
    mappings: Record<string, HandleMappingEntry>;
}

export function adaptHandleMapping(value: unknown): HandleMappingResult {
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

export {
    defaults,
    adaptPackagingMapping,
    adaptCylinderMapping,
    adaptLockMapping,
    adaptLockForkMapping,
    normalizeLockMappingKey,
};

export const normalizePackagingMappingKey: (input: unknown) => string = sharedMappingAdapterCore.normalizePackagingMappingKey;

