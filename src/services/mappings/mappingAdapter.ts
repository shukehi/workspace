// @ts-expect-error shared ESM adapter core is consumed by both frontend and backend
import * as sharedMappingAdapterCore from '../../../shared/mappings/mapping-adapter-core.mjs';
import type {
  CylinderMappingConfig,
  HandleMappingConfig,
  HandleMappingEntry,
  LockMappingConfig,
  LockForkMappingConfig,
  PackagingMappingConfig,
} from '@/types/mapping';

const {
  defaults,
  normalizePackagingMappingKey: normalizePackagingMappingKeyShared,
  normalizeLockMappingKey: normalizeLockMappingKeyShared,
  adaptPackagingMapping: adaptPackagingMappingShared,
  adaptCylinderMapping: adaptCylinderMappingShared,
  adaptLockForkMapping: adaptLockForkMappingShared,
  adaptLockMapping: adaptLockMappingShared,
} = sharedMappingAdapterCore;

const DEFAULT_HANDLE_SUPPLIER = '拉手供应商';
const DEFAULT_HANDLE_UNMATCHED_SUPPLIER = '待人工处理';
const DEFAULT_HANDLE_MANUAL_REVIEW_LABEL = '未匹配拉手(待人工处理)';
const DEFAULT_HANDLE_SINGLE_KEYWORDS = ['单活'];
const DEFAULT_HANDLE_DOUBLE_KEYWORDS = ['双活'];
const DEFAULT_HANDLE_EXPORT_CUSTOMER_KEYWORDS = ['三部'];
const DEFAULT_HANDLE_EXPORT_ACTIVITY: 'double' = 'double';
const DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS = ['冲整体拉手孔', '拉手孔', '开拉手孔', '开孔', '打孔'];
const DEFAULT_HANDLE_FALLBACK_SOURCES: Array<'remark' | 'xsbz'> = ['remark', 'xsbz'];
const DEFAULT_HANDLE_THICKNESS_PACKS: Record<string, string> = {
  '5': '5公分配件包',
  '7': '7公分配件包',
  '9': '9公分配件包',
  '10': '10公分配件包',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function toTrimmedString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function adaptStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => toTrimmedString(item))
    .filter(Boolean);
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
    ...(materialCode ? { materialCode } : {}),
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

export function normalizePackagingMappingKey(input: string): string {
  return normalizePackagingMappingKeyShared(input);
}

export function normalizeLockMappingKey(input: string): string {
  return normalizeLockMappingKeyShared(input);
}

export const EMPTY_PACKAGING_MAPPING: PackagingMappingConfig = {
  supplierName: defaults.DEFAULT_PACKAGING_SUPPLIER,
  mappings: {},
};

export const EMPTY_CYLINDER_MAPPING: CylinderMappingConfig = {
  dimensions: {},
  specialRules: [],
  secondaryDimensions: {},
  secondarySpecialRules: [],
  mappings: {},
  customLogos: [],
  excludedCylinders: [...defaults.DEFAULT_CYLINDER_EXCLUDED],
};

export const EMPTY_LOCK_FORK_MAPPING: LockForkMappingConfig = {
  baseDimensions: {},
  highHeightRules: {},
  lockTypes: {},
  edgeTypes: {},
  hangingFeet: {
    standard: defaults.DEFAULT_LOCK_FORK_HANGING_FEET,
    keywords: ['吊脚', 'diaojiao'],
  },
  heightReference: defaults.DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
  suppliers: {},
};

export const EMPTY_HANDLE_MAPPING: HandleMappingConfig = {
  defaultSupplier: DEFAULT_HANDLE_SUPPLIER,
  unmatchedSupplier: DEFAULT_HANDLE_UNMATCHED_SUPPLIER,
  manualReviewLabel: DEFAULT_HANDLE_MANUAL_REVIEW_LABEL,
  singleKeywords: [...DEFAULT_HANDLE_SINGLE_KEYWORDS],
  doubleKeywords: [...DEFAULT_HANDLE_DOUBLE_KEYWORDS],
  exportCustomerKeywords: [...DEFAULT_HANDLE_EXPORT_CUSTOMER_KEYWORDS],
  defaultActivityForExport: DEFAULT_HANDLE_EXPORT_ACTIVITY,
  placeholderKeywords: [...DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS],
  fallbackModelSources: [...DEFAULT_HANDLE_FALLBACK_SOURCES],
  thicknessAccessoryPacks: { ...DEFAULT_HANDLE_THICKNESS_PACKS },
  mappings: {},
};

export const EMPTY_LOCK_MAPPING: LockMappingConfig = {
  defaultUnit: defaults.DEFAULT_LOCK_UNIT,
  primaryLabel: defaults.DEFAULT_LOCK_PRIMARY_LABEL,
  secondaryLabel: defaults.DEFAULT_LOCK_SECONDARY_LABEL,
  mappings: {},
};

export function adaptPackagingMapping(value: unknown): PackagingMappingConfig {
  return adaptPackagingMappingShared(value) as PackagingMappingConfig;
}

export function adaptCylinderMapping(value: unknown): CylinderMappingConfig {
  return adaptCylinderMappingShared(value) as CylinderMappingConfig;
}

export function adaptLockForkMapping(value: unknown): LockForkMappingConfig {
  return adaptLockForkMappingShared(value) as LockForkMappingConfig;
}

export function adaptHandleMapping(value: unknown): HandleMappingConfig {
  const record = asRecord(value);
  const packs = adaptThicknessAccessoryPacks(record.thicknessAccessoryPacks);
  const fallbackModelSources = adaptStringList(record.fallbackModelSources)
    .filter((item): item is 'remark' | 'xsbz' => item === 'remark' || item === 'xsbz');

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
    mappings: adaptHandleMappings(record.mappings),
  };
}

export function adaptLockMapping(value: unknown): LockMappingConfig {
  return adaptLockMappingShared(value) as LockMappingConfig;
}
