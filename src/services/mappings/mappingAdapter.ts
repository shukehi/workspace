import type {
  CylinderDimensionRule,
  CylinderDimensionVariant,
  CylinderMappingConfig,
  CylinderMappingEntry,
  CylinderSpecialRule,
  HandleMappingConfig,
  HandleMappingEntry,
  LockMappingConfig,
  LockMappingEntry,
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkDimensionPair,
  LockForkEdgeTypeConfig,
  LockForkHangingFeetConfig,
  LockForkHighHeightRule,
  LockForkMappingConfig,
  LockForkTypeConfig,
  PackagingMappingConfig,
} from '@/types/mapping';

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
const DEFAULT_HANDLE_EXPORT_ACTIVITY: 'double' = 'double';
const DEFAULT_HANDLE_PLACEHOLDER_KEYWORDS = ['冲整体拉手孔', '拉手孔', '开拉手孔', '开孔', '打孔'];
const DEFAULT_HANDLE_FALLBACK_SOURCES: Array<'remark' | 'xsbz'> = ['remark', 'xsbz'];
const DEFAULT_LOCK_UNIT = '套';
const DEFAULT_LOCK_PRIMARY_LABEL = '主锁';
const DEFAULT_LOCK_SECONDARY_LABEL = '副锁';
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

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function hasCanonicalPackagingShape(value: Record<string, unknown>) {
  return Object.prototype.hasOwnProperty.call(value, 'mappings')
    || Object.prototype.hasOwnProperty.call(value, 'supplierName');
}

export function normalizePackagingMappingKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

export function normalizeLockMappingKey(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

export const EMPTY_PACKAGING_MAPPING: PackagingMappingConfig = {
  supplierName: DEFAULT_PACKAGING_SUPPLIER,
  mappings: {},
};

export const EMPTY_CYLINDER_MAPPING: CylinderMappingConfig = {
  dimensions: {},
  specialRules: [],
  secondaryDimensions: {},
  secondarySpecialRules: [],
  mappings: {},
  customLogos: [],
  excludedCylinders: [...DEFAULT_CYLINDER_EXCLUDED],
};

export const EMPTY_LOCK_FORK_MAPPING: LockForkMappingConfig = {
  baseDimensions: {},
  highHeightRules: {},
  lockTypes: {},
  edgeTypes: {},
  hangingFeet: {
    standard: DEFAULT_LOCK_FORK_HANGING_FEET,
    keywords: ['吊脚', 'diaojiao'],
  },
  heightReference: DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
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
  defaultUnit: DEFAULT_LOCK_UNIT,
  primaryLabel: DEFAULT_LOCK_PRIMARY_LABEL,
  secondaryLabel: DEFAULT_LOCK_SECONDARY_LABEL,
  mappings: {},
};

function adaptCylinderVariant(value: unknown): CylinderDimensionVariant | null {
  const record = asRecord(value);
  const code = toTrimmedString(record.code);
  const eccentricity = toTrimmedString(record.eccentricity);
  const remark = toTrimmedString(record.remark);

  if (!code && !eccentricity && !remark) return null;

  return {
    code,
    eccentricity,
    ...(remark ? { remark } : {}),
  };
}

function adaptCylinderVariantMap(value: unknown): Record<string, CylinderDimensionVariant> {
  const record = asRecord(value);
  const variants: Record<string, CylinderDimensionVariant> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const variant = adaptCylinderVariant(rawValue);
    if (!key || !variant) return;
    variants[key] = variant;
  });

  return variants;
}

function adaptCylinderDimensionRule(value: unknown): CylinderDimensionRule | null {
  const direct = adaptCylinderVariant(value);
  const record = asRecord(value);
  const variants = adaptCylinderVariantMap(record.variants);

  if (!direct && Object.keys(variants).length === 0) return null;

  return {
    code: direct?.code || '',
    eccentricity: direct?.eccentricity || '',
    ...(direct?.remark ? { remark: direct.remark } : {}),
    ...(Object.keys(variants).length > 0 ? { variants } : {}),
  };
}

function adaptCylinderDimensionMap(value: unknown): Record<string, CylinderDimensionRule> {
  const record = asRecord(value);
  const dimensions: Record<string, CylinderDimensionRule> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const dimension = adaptCylinderDimensionRule(rawValue);
    if (!key || !dimension) return;
    dimensions[key] = dimension;
  });

  return dimensions;
}

function adaptCylinderSpecialRule(value: unknown): CylinderSpecialRule | null {
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
    variants,
  };
}

function adaptCylinderSpecialRules(value: unknown): CylinderSpecialRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => adaptCylinderSpecialRule(item))
    .filter((item): item is CylinderSpecialRule => Boolean(item));
}

function adaptCylinderMappingEntry(value: unknown): CylinderMappingEntry | null {
  const record = asRecord(value);
  const supplier = toTrimmedString(record.supplier);
  const template = toTrimmedString(record.template);

  if (!supplier && !template) return null;

  return {
    supplier,
    template,
  };
}

function adaptCylinderMappings(value: unknown): Record<string, CylinderMappingEntry> {
  const record = asRecord(value);
  const mappings: Record<string, CylinderMappingEntry> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapping = adaptCylinderMappingEntry(rawValue);
    if (!key || !mapping) return;
    mappings[key] = mapping;
  });

  return mappings;
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

function adaptLockMappingEntry(value: unknown): LockMappingEntry | null {
  const record = asRecord(value);
  const supplier = toTrimmedString(record.supplier);
  const vendorName = toTrimmedString(record.vendorName) || toTrimmedString(record.name);
  const primarySpec = toTrimmedString(record.primarySpec);
  const secondarySpec = toTrimmedString(record.secondarySpec);
  const remark = toTrimmedString(record.remark);

  if (!supplier && !vendorName && !primarySpec && !secondarySpec && !remark) return null;

  return {
    supplier,
    vendorName,
    ...(primarySpec ? { primarySpec } : {}),
    ...(secondarySpec ? { secondarySpec } : {}),
    ...(remark ? { remark } : {}),
  };
}

function adaptLockMappings(value: unknown): Record<string, LockMappingEntry> {
  const record = asRecord(value);
  const mappings: Record<string, LockMappingEntry> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapping = adaptLockMappingEntry(rawValue);
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

function adaptLockForkDimensionPair(value: unknown): LockForkDimensionPair | null {
  const record = asRecord(value);
  const base1 = toFiniteNumber(record.base1, NaN);
  const base2 = toFiniteNumber(record.base2, NaN);

  if (!Number.isFinite(base1) && !Number.isFinite(base2)) return null;

  return {
    base1: Number.isFinite(base1) ? base1 : 0,
    base2: Number.isFinite(base2) ? base2 : 0,
  };
}

function adaptLockForkDimensionGroup(value: unknown): LockForkDimensionGroup | null {
  const record = asRecord(value);
  const upper = adaptLockForkDimensionPair(record.upper);
  const lower = adaptLockForkDimensionPair(record.lower);

  if (!upper || !lower) return null;

  return { upper, lower };
}

function adaptLockForkBaseDimensionRule(value: unknown): LockForkBaseDimensionRule | null {
  const record = asRecord(value);
  const standard = adaptLockForkDimensionGroup(record.standard);
  const withHangingFeet = adaptLockForkDimensionGroup(record.withHangingFeet);

  if (!standard && !withHangingFeet) return null;

  return {
    ...(standard ? { standard } : {}),
    ...(withHangingFeet ? { withHangingFeet } : {}),
  };
}

function adaptLockForkBaseDimensions(value: unknown): Record<string, LockForkBaseDimensionRule> {
  const record = asRecord(value);
  const baseDimensions: Record<string, LockForkBaseDimensionRule> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const dimension = adaptLockForkBaseDimensionRule(rawValue);
    if (!key || !dimension) return;
    baseDimensions[key] = dimension;
  });

  return baseDimensions;
}

function adaptLockForkHighHeightRule(value: unknown): LockForkHighHeightRule | null {
  const record = asRecord(value);
  const standard = adaptLockForkDimensionGroup(record.standard);
  const withHangingFeet = adaptLockForkDimensionGroup(record.withHangingFeet);
  const minHeight = toFiniteNumber(record.minHeight, NaN);
  const heightReference = toFiniteNumber(record.heightReference, NaN);

  if (!Number.isFinite(minHeight) && !Number.isFinite(heightReference) && !standard && !withHangingFeet) {
    return null;
  }

  return {
    minHeight: Number.isFinite(minHeight) ? minHeight : DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
    heightReference: Number.isFinite(heightReference) ? heightReference : DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
    ...(standard ? { standard } : {}),
    ...(withHangingFeet ? { withHangingFeet } : {}),
  };
}

function adaptLockForkHighHeightRules(value: unknown): Record<string, LockForkHighHeightRule> {
  const record = asRecord(value);
  const rules: Record<string, LockForkHighHeightRule> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const rule = adaptLockForkHighHeightRule(rawValue);
    if (!key || !rule) return;
    rules[key] = rule;
  });

  return rules;
}

function adaptLockForkTypeConfig(value: unknown): LockForkTypeConfig | null {
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
    ...(lower ? { lower } : {}),
  };
}

function adaptLockForkTypeMap<T>(
  value: unknown,
  adapter: (input: unknown) => T | null,
): Record<string, T> {
  const record = asRecord(value);
  const result: Record<string, T> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const adapted = adapter(rawValue);
    if (!key || !adapted) return;
    result[key] = adapted;
  });

  return result;
}

function adaptLockForkEdgeTypeConfig(value: unknown): LockForkEdgeTypeConfig | null {
  const record = asRecord(value);
  const nameModifier = toTrimmedString(record.nameModifier);

  if (!nameModifier) return null;

  return { nameModifier };
}

function adaptLockForkHangingFeetConfig(value: unknown): LockForkHangingFeetConfig {
  const record = asRecord(value);
  const standard = toFiniteNumber(record.standard, DEFAULT_LOCK_FORK_HANGING_FEET);
  const keywords = adaptStringList(record.keywords);

  return {
    standard,
    keywords: keywords.length > 0 ? keywords : [...EMPTY_LOCK_FORK_MAPPING.hangingFeet.keywords],
  };
}

function adaptSuppliers(value: unknown): Record<string, string> {
  const record = asRecord(value);
  const suppliers: Record<string, string> = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const supplier = toTrimmedString(rawValue);
    if (!key || !supplier) return;
    suppliers[key] = supplier;
  });

  return suppliers;
}

export function adaptPackagingMapping(value: unknown): PackagingMappingConfig {
  const record = asRecord(value);
  const canonical = hasCanonicalPackagingShape(record);
  const mappingSource = canonical ? asRecord(record.mappings) : record;
  const mappings: Record<string, string> = {};

  Object.entries(mappingSource).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapped = toTrimmedString(rawValue);
    if (!key || !mapped) return;
    mappings[key] = mapped;
  });

  const supplierName = canonical
    ? toTrimmedString(record.supplierName) || DEFAULT_PACKAGING_SUPPLIER
    : DEFAULT_PACKAGING_SUPPLIER;

  return {
    supplierName,
    mappings,
  };
}

export function adaptCylinderMapping(value: unknown): CylinderMappingConfig {
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
    excludedCylinders: hasExcludedCylinders ? excludedCylinders : [...DEFAULT_CYLINDER_EXCLUDED],
  };
}

export function adaptLockForkMapping(value: unknown): LockForkMappingConfig {
  const record = asRecord(value);

  return {
    baseDimensions: adaptLockForkBaseDimensions(record.baseDimensions),
    highHeightRules: adaptLockForkHighHeightRules(record.highHeightRules),
    lockTypes: adaptLockForkTypeMap(record.lockTypes, adaptLockForkTypeConfig),
    edgeTypes: adaptLockForkTypeMap(record.edgeTypes, adaptLockForkEdgeTypeConfig),
    hangingFeet: adaptLockForkHangingFeetConfig(record.hangingFeet),
    heightReference: toFiniteNumber(record.heightReference, DEFAULT_LOCK_FORK_HEIGHT_REFERENCE),
    suppliers: adaptSuppliers(record.suppliers),
  };
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
  const record = asRecord(value);

  return {
    defaultUnit: toTrimmedString(record.defaultUnit) || DEFAULT_LOCK_UNIT,
    primaryLabel: toTrimmedString(record.primaryLabel) || DEFAULT_LOCK_PRIMARY_LABEL,
    secondaryLabel: toTrimmedString(record.secondaryLabel) || DEFAULT_LOCK_SECONDARY_LABEL,
    mappings: adaptLockMappings(record.mappings),
  };
}
