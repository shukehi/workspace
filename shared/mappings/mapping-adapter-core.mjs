import {
  asRecord,
  toTrimmedString,
} from './mapping-common.mjs';

const DEFAULT_PACKAGING_SUPPLIER = '方亮包装';
const DEFAULT_LOCK_FORK_HEIGHT_REFERENCE = 2050;
const DEFAULT_LOCK_FORK_HANGING_FEET = 35;
const DEFAULT_CYLINDER_EXCLUDED = ['指纹锁配套锁芯'];
const DEFAULT_LOCK_UNIT = '套';
const DEFAULT_LOCK_PRIMARY_LABEL = '主锁';
const DEFAULT_LOCK_SECONDARY_LABEL = '副锁';
const DEFAULT_HANDLE_SUPPLIER = '拉手供应商';
const DEFAULT_HANDLE_UNMATCHED_SUPPLIER = '待人工处理';
const DEFAULT_HANDLE_MANUAL_REVIEW_LABEL = '未匹配拉手(待人工处理)';

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function adaptStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => toTrimmedString(item)).filter(Boolean);
}

function hasCanonicalPackagingShape(value) {
  return Object.prototype.hasOwnProperty.call(value, 'mappings')
    || Object.prototype.hasOwnProperty.call(value, 'supplierName');
}

function normalizePackagingMappingKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

function normalizeLockMappingKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
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
    ...(remark ? { remark } : {}),
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
    ...(Object.keys(variants).length > 0 ? { variants } : {}),
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
    variants,
  };
}

function adaptCylinderSpecialRules(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => adaptCylinderSpecialRule(item)).filter(Boolean);
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

function adaptThicknessMaterialCodes(value) {
  const record = asRecord(value);
  const codes = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const code = toTrimmedString(rawValue);
    if (!key || !code) return;
    codes[key] = code;
  });

  return codes;
}

function adaptCylinderAccessoryPackRule(value) {
  const record = asRecord(value);
  const conditionField = toTrimmedString(record.conditionField);
  const keyword = toTrimmedString(record.keyword);
  const supplier = toTrimmedString(record.supplier);
  const itemName = toTrimmedString(record.itemName);
  const unit = toTrimmedString(record.unit);
  const remark = toTrimmedString(record.remark);
  const thicknessAccessoryPacks = adaptThicknessAccessoryPacks(record.thicknessAccessoryPacks);
  const thicknessMaterialCodes = adaptThicknessMaterialCodes(record.thicknessMaterialCodes);

  if (
    !conditionField
    && !keyword
    && !supplier
    && !itemName
    && !unit
    && !remark
    && Object.keys(thicknessAccessoryPacks).length === 0
    && Object.keys(thicknessMaterialCodes).length === 0
  ) return null;

  return {
    conditionField,
    keyword,
    supplier,
    thicknessAccessoryPacks,
    thicknessMaterialCodes,
    ...(itemName ? { itemName } : {}),
    ...(unit ? { unit } : {}),
    ...(remark ? { remark } : {}),
  };
}

function adaptCylinderAccessoryPackRules(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => adaptCylinderAccessoryPackRule(item)).filter(Boolean);
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

function adaptLockMappingEntry(value) {
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

function adaptLockMappings(value) {
  const record = asRecord(value);
  const mappings = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapping = adaptLockMappingEntry(rawValue);
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
    base2: Number.isFinite(base2) ? base2 : 0,
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
    ...(withHangingFeet ? { withHangingFeet } : {}),
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

function adaptLockForkHighHeightRule(value) {
  const record = asRecord(value);
  const standard = adaptLockForkDimensionGroup(record.standard);
  const withHangingFeet = adaptLockForkDimensionGroup(record.withHangingFeet);
  const minHeight = toFiniteNumber(record.minHeight, NaN);
  const heightReference = toFiniteNumber(record.heightReference, NaN);

  if (!standard && !withHangingFeet && !Number.isFinite(minHeight) && !Number.isFinite(heightReference)) return null;

  return {
    minHeight: Number.isFinite(minHeight) ? minHeight : 0,
    heightReference: Number.isFinite(heightReference) ? heightReference : DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
    ...(standard ? { standard } : {}),
    ...(withHangingFeet ? { withHangingFeet } : {}),
  };
}

function adaptLockForkHighHeightRules(value) {
  const record = asRecord(value);
  const highHeightRules = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const rule = adaptLockForkHighHeightRule(rawValue);
    if (!key || !rule) return;
    highHeightRules[key] = rule;
  });

  return highHeightRules;
}

function adaptLockForkTypeRules(value) {
  const record = asRecord(value);
  const rules = {};

  Object.entries(record).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const current = asRecord(rawValue);
    if (!key) return;
    rules[key] = {
      category: toTrimmedString(current.category),
      nameModifier: toTrimmedString(current.nameModifier),
      upper: toTrimmedString(current.upper),
      lower: toTrimmedString(current.lower),
    };
  });

  return rules;
}

function adaptPackagingMapping(value) {
  const record = asRecord(value);
  const rawMappings = hasCanonicalPackagingShape(record)
    ? asRecord(record.mappings)
    : record;
  const mappings = {};

  Object.entries(rawMappings).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapped = toTrimmedString(rawValue);
    if (!key || !mapped) return;
    mappings[key] = mapped;
  });

  return {
    supplierName: toTrimmedString(record.supplierName) || DEFAULT_PACKAGING_SUPPLIER,
    mappings,
  };
}

function adaptCylinderMapping(value) {
  const record = asRecord(value);

  return {
    dimensions: adaptCylinderDimensionMap(record.dimensions),
    secondaryDimensions: adaptCylinderDimensionMap(record.secondaryDimensions),
    specialRules: adaptCylinderSpecialRules(record.specialRules),
    secondarySpecialRules: adaptCylinderSpecialRules(record.secondarySpecialRules),
    secondaryAccessoryPackRules: adaptCylinderAccessoryPackRules(record.secondaryAccessoryPackRules),
    mappings: adaptCylinderMappings(record.mappings),
    customLogos: adaptStringList(record.customLogos),
    excludedCylinders: (() => {
      const excluded = adaptStringList(record.excludedCylinders);
      return excluded.length > 0 ? excluded : [...DEFAULT_CYLINDER_EXCLUDED];
    })(),
  };
}

function adaptLockForkMapping(value) {
  const record = asRecord(value);
  const keywords = adaptStringList(asRecord(record.hangingFeet).keywords);

  return {
    baseDimensions: adaptLockForkBaseDimensions(record.baseDimensions),
    highHeightRules: adaptLockForkHighHeightRules(record.highHeightRules),
    lockTypes: adaptLockForkTypeRules(record.lockTypes),
    edgeTypes: adaptLockForkTypeRules(record.edgeTypes),
    hangingFeet: {
      standard: toFiniteNumber(asRecord(record.hangingFeet).standard, DEFAULT_LOCK_FORK_HANGING_FEET),
      keywords: keywords.length > 0 ? keywords : ['吊脚', 'diaojiao'],
    },
    heightReference: toFiniteNumber(record.heightReference, DEFAULT_LOCK_FORK_HEIGHT_REFERENCE),
    suppliers: {
      default: toTrimmedString(asRecord(record.suppliers).default),
    },
  };
}

function adaptLockMapping(value) {
  const record = asRecord(value);

  return {
    defaultUnit: toTrimmedString(record.defaultUnit) || DEFAULT_LOCK_UNIT,
    primaryLabel: toTrimmedString(record.primaryLabel) || DEFAULT_LOCK_PRIMARY_LABEL,
    secondaryLabel: toTrimmedString(record.secondaryLabel) || DEFAULT_LOCK_SECONDARY_LABEL,
    mappings: adaptLockMappings(record.mappings),
  };
}

const defaults = {
  DEFAULT_PACKAGING_SUPPLIER,
  DEFAULT_LOCK_FORK_HEIGHT_REFERENCE,
  DEFAULT_LOCK_FORK_HANGING_FEET,
  DEFAULT_CYLINDER_EXCLUDED,
  DEFAULT_LOCK_UNIT,
  DEFAULT_LOCK_PRIMARY_LABEL,
  DEFAULT_LOCK_SECONDARY_LABEL,
  DEFAULT_HANDLE_SUPPLIER,
  DEFAULT_HANDLE_UNMATCHED_SUPPLIER,
  DEFAULT_HANDLE_MANUAL_REVIEW_LABEL,
};

export {
  defaults,
  normalizePackagingMappingKey,
  normalizeLockMappingKey,
  adaptPackagingMapping,
  adaptCylinderMapping,
  adaptLockForkMapping,
  adaptLockMapping,
};
