import type {
  CylinderDimensionRule,
  CylinderDimensionVariant,
  CylinderMappingConfig,
  CylinderMappingEntry,
  CylinderSpecialRule,
  LockForkBaseDimensionRule,
  LockForkDimensionGroup,
  LockForkDimensionPair,
  LockForkEdgeTypeConfig,
  LockForkHangingFeetConfig,
  LockForkMappingConfig,
  LockForkTypeConfig,
  PackagingMappingConfig,
} from '@/types/mapping';

const DEFAULT_PACKAGING_SUPPLIER = '方亮包装';
const DEFAULT_LOCK_FORK_HEIGHT_REFERENCE = 2050;
const DEFAULT_LOCK_FORK_HANGING_FEET = 35;

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
};

export const EMPTY_LOCK_FORK_MAPPING: LockForkMappingConfig = {
  baseDimensions: {},
  lockTypes: {},
  edgeTypes: {},
  hangingFeet: {
    standard: DEFAULT_LOCK_FORK_HANGING_FEET,
    keywords: ['吊脚', 'diaojiao'],
  },
  heightReference: DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
  suppliers: {},
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

  return {
    dimensions: adaptCylinderDimensionMap(record.dimensions),
    specialRules: adaptCylinderSpecialRules(record.specialRules),
    secondaryDimensions: adaptCylinderDimensionMap(record.secondaryDimensions),
    secondarySpecialRules: adaptCylinderSpecialRules(record.secondarySpecialRules),
    mappings: adaptCylinderMappings(record.mappings),
    customLogos: adaptStringList(record.customLogos),
  };
}

export function adaptLockForkMapping(value: unknown): LockForkMappingConfig {
  const record = asRecord(value);

  return {
    baseDimensions: adaptLockForkBaseDimensions(record.baseDimensions),
    lockTypes: adaptLockForkTypeMap(record.lockTypes, adaptLockForkTypeConfig),
    edgeTypes: adaptLockForkTypeMap(record.edgeTypes, adaptLockForkEdgeTypeConfig),
    hangingFeet: adaptLockForkHangingFeetConfig(record.hangingFeet),
    heightReference: toFiniteNumber(record.heightReference, DEFAULT_LOCK_FORK_HEIGHT_REFERENCE),
    suppliers: adaptSuppliers(record.suppliers),
  };
}
