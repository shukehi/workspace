import {
  adaptCylinderMapping,
  adaptHandleMapping,
  adaptLockMapping,
  adaptLockForkMapping,
  adaptPackagingMapping,
  normalizeLockMappingKey,
  normalizePackagingMappingKey,
} from '@/services/mappings/mappingAdapter';
import type {
  CylinderMappingConfig,
  HandleMappingConfig,
  LockMappingConfig,
  LockForkBaseDimensionRule,
  LockForkMappingConfig,
  MappingValidationIssue,
  PackagingMappingConfig,
} from '@/types/mapping';

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

function isPlainObject(value: unknown) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function quotePathSegment(segment: string) {
  return JSON.stringify(segment);
}

function createIssue(path: string, code: string, message: string): MappingValidationIssue {
  return { path, code, message };
}

function normalizeCylinderExcludeKey(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

function normalizeHandleMappingKey(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

function getPackagingMappingSource(value: unknown) {
  const record = asRecord(value);
  if (Object.prototype.hasOwnProperty.call(record, 'mappings')) {
    return asRecord(record.mappings);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'supplierName')) {
    return {};
  }
  return record;
}

export function validatePackagingMapping(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  const record = asRecord(value);
  const adapted = adaptPackagingMapping(value);

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '包装映射必须是对象'));
    return issues;
  }

  if (Object.prototype.hasOwnProperty.call(record, 'supplierName') && !toTrimmedString(record.supplierName)) {
    issues.push(createIssue('supplierName', 'required', 'supplierName 不能为空'));
  }

  const rawMappings = getPackagingMappingSource(value);
  const normalizedMap = new Map<string, string>();

  Object.entries(rawMappings).forEach(([rawKey, rawValue]) => {
    const key = toTrimmedString(rawKey);
    const mapped = toTrimmedString(rawValue);
    const path = `mappings[${quotePathSegment(key || String(rawKey))}]`;

    if (!key) {
      issues.push(createIssue(path, 'required', '包装映射 key 不能为空'));
      return;
    }

    if (!mapped) {
      issues.push(createIssue(path, 'required', '包装映射 value 不能为空'));
      return;
    }

    const normalizedKey = normalizePackagingMappingKey(key);
    const existing = normalizedMap.get(normalizedKey);
    if (existing && existing !== key) {
      issues.push(createIssue(path, 'normalized-conflict', '包装映射存在 normalize 后冲突'));
      return;
    }

    normalizedMap.set(normalizedKey, key);
  });

  if (!adapted.supplierName) {
    issues.push(createIssue('supplierName', 'required', 'supplierName 不能为空'));
  }

  return issues;
}

function validateCylinderDimensionMap(
  path: string,
  dimensions: Record<string, { code: string; eccentricity: string; variants?: Record<string, { code: string; eccentricity: string }> }>,
  issues: MappingValidationIssue[],
) {
  Object.entries(dimensions).forEach(([thickness, rule]) => {
    const currentPath = `${path}[${quotePathSegment(thickness)}]`;
    const variants = rule.variants || {};
    const hasVariants = Object.keys(variants).length > 0;
    const hasDirectFields = Boolean(rule.code || rule.eccentricity);

    if (!hasVariants && !hasDirectFields) {
      issues.push(createIssue(currentPath, 'required', '尺寸规则至少需要 code/eccentricity 或 variants'));
    }

    if (hasDirectFields) {
      if (!rule.code) {
        issues.push(createIssue(`${currentPath}.code`, 'required', 'code 不能为空'));
      }
      if (!rule.eccentricity) {
        issues.push(createIssue(`${currentPath}.eccentricity`, 'required', 'eccentricity 不能为空'));
      }
    }

    Object.entries(variants).forEach(([variantKey, variant]) => {
      const variantPath = `${currentPath}.variants[${quotePathSegment(variantKey)}]`;
      if (!variant.code) {
        issues.push(createIssue(`${variantPath}.code`, 'required', 'code 不能为空'));
      }
      if (!variant.eccentricity) {
        issues.push(createIssue(`${variantPath}.eccentricity`, 'required', 'eccentricity 不能为空'));
      }
    });
  });
}

function validateCylinderRuleGroup(
  path: string,
  rules: unknown[],
  validThicknessSet: Set<string>,
  issues: MappingValidationIssue[],
) {
  rules.forEach((rule, index) => {
    const rulePath = `${path}[${index}]`;
    const rawRule = asRecord(rule);
    const conditionField = toTrimmedString(rawRule.conditionField);
    const keyword = toTrimmedString(rawRule.keyword);
    const thickness = toTrimmedString(rawRule.thickness);
    const rawVariants = asRecord(rawRule.variants);

    if (!conditionField) {
      issues.push(createIssue(`${rulePath}.conditionField`, 'required', 'conditionField 不能为空'));
    }
    if (!keyword) {
      issues.push(createIssue(`${rulePath}.keyword`, 'required', 'keyword 不能为空'));
    }
    if (!thickness) {
      issues.push(createIssue(`${rulePath}.thickness`, 'required', 'thickness 不能为空'));
    } else if (Object.keys(rawVariants).length === 0 && validThicknessSet.size > 0 && !validThicknessSet.has(thickness)) {
      issues.push(createIssue(`${rulePath}.thickness`, 'unknown-reference', 'thickness 未在 dimensions 中定义'));
    }

    if (Object.keys(rawVariants).length === 0) {
      issues.push(createIssue(`${rulePath}.variants`, 'required', 'variants 不能为空'));
    }

    Object.entries(rawVariants).forEach(([variantKey, rawVariant]) => {
      const variantPath = `${rulePath}.variants[${quotePathSegment(variantKey)}]`;
      const variant = asRecord(rawVariant);
      if (!toTrimmedString(variant.code)) {
        issues.push(createIssue(`${variantPath}.code`, 'required', 'code 不能为空'));
      }
      if (!toTrimmedString(variant.eccentricity)) {
        issues.push(createIssue(`${variantPath}.eccentricity`, 'required', 'eccentricity 不能为空'));
      }
    });
  });
}

function validateRawCylinderMappings(value: unknown, issues: MappingValidationIssue[]) {
  const mappings = asRecord(asRecord(value).mappings);

  Object.entries(mappings).forEach(([name, rawEntry]) => {
    const entry = asRecord(rawEntry);
    const path = `mappings[${quotePathSegment(name)}]`;
    if (!isPlainObject(rawEntry)) {
      issues.push(createIssue(path, 'invalid-type', 'mapping entry 必须是对象'));
      return;
    }
    if (!toTrimmedString(entry.supplier)) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!toTrimmedString(entry.template)) {
      issues.push(createIssue(`${path}.template`, 'required', 'template 不能为空'));
    }
  });
}

export function validateCylinderMapping(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  const rawRecord = asRecord(value);

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '锁芯映射必须是对象'));
    return issues;
  }

  const adapted = adaptCylinderMapping(value);
  validateRawCylinderMappings(value, issues);
  validateCylinderDimensionMap('dimensions', adapted.dimensions, issues);
  validateCylinderDimensionMap('secondaryDimensions', adapted.secondaryDimensions, issues);

  validateCylinderRuleGroup(
    'specialRules',
    Array.isArray(rawRecord.specialRules) ? rawRecord.specialRules : [],
    new Set(Object.keys(adapted.dimensions)),
    issues,
  );
  validateCylinderRuleGroup(
    'secondarySpecialRules',
    Array.isArray(rawRecord.secondarySpecialRules) ? rawRecord.secondarySpecialRules : [],
    new Set(Object.keys(adapted.secondaryDimensions)),
    issues,
  );

  Object.entries(adapted.mappings).forEach(([name, mapping]) => {
    const path = `mappings[${quotePathSegment(name)}]`;
    if (!mapping.supplier) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!mapping.template) {
      issues.push(createIssue(`${path}.template`, 'required', 'template 不能为空'));
    }
  });

  const rawCustomLogos = asRecord(value).customLogos;
  if (rawCustomLogos !== undefined && !Array.isArray(rawCustomLogos)) {
    issues.push(createIssue('customLogos', 'invalid-type', 'customLogos 必须是数组'));
  }

  adapted.customLogos.forEach((logo, index) => {
    if (!logo) {
      issues.push(createIssue(`customLogos[${index}]`, 'required', 'customLogos 不能为空字符串'));
    }
  });

  const rawExcludedCylinders = asRecord(value).excludedCylinders;
  if (rawExcludedCylinders !== undefined && !Array.isArray(rawExcludedCylinders)) {
    issues.push(createIssue('excludedCylinders', 'invalid-type', 'excludedCylinders 必须是数组'));
  }

  if (Array.isArray(rawExcludedCylinders)) {
    const excludedSeen = new Set<string>();
    rawExcludedCylinders.forEach((rawName, index) => {
      const name = toTrimmedString(rawName);
      if (!name) {
        issues.push(createIssue(`excludedCylinders[${index}]`, 'required', 'excludedCylinders 不能为空字符串'));
        return;
      }
      const normalized = normalizeCylinderExcludeKey(name);
      if (excludedSeen.has(normalized)) {
        issues.push(createIssue(`excludedCylinders[${index}]`, 'duplicate', 'excludedCylinders 存在重复值'));
        return;
      }
      excludedSeen.add(normalized);
    });
  }

  return issues;
}

function validateLockForkDimensionGroup(
  path: string,
  value: LockForkBaseDimensionRule | undefined,
  issues: MappingValidationIssue[],
) {
  if (!value) {
    issues.push(createIssue(path, 'required', '基础尺寸不能为空'));
    return;
  }

  (['standard', 'withHangingFeet'] as const).forEach((key) => {
    const group = value[key];
    if (!group) return;

    (['upper', 'lower'] as const).forEach((section) => {
      const pair = group[section];
      const pairPath = `${path}.${key}.${section}`;
      if (!Number.isFinite(pair.base1)) {
        issues.push(createIssue(`${pairPath}.base1`, 'invalid-number', 'base1 必须是数字'));
      }
      if (!Number.isFinite(pair.base2)) {
        issues.push(createIssue(`${pairPath}.base2`, 'invalid-number', 'base2 必须是数字'));
      }
    });
  });
}

function validateLockForkHighHeightRule(path: string, value: LockForkBaseDimensionRule & { minHeight?: number; heightReference?: number }, issues: MappingValidationIssue[]) {
  if (!Number.isFinite(value.minHeight)) {
    issues.push(createIssue(`${path}.minHeight`, 'invalid-number', 'minHeight 必须是数字'));
  }
  if (!Number.isFinite(value.heightReference)) {
    issues.push(createIssue(`${path}.heightReference`, 'invalid-number', 'heightReference 必须是数字'));
  }
  validateLockForkDimensionGroup(path, value, issues);
}

function validateRawLockForkBaseDimensions(value: unknown, issues: MappingValidationIssue[]) {
  const baseDimensions = asRecord(asRecord(value).baseDimensions);

  Object.entries(baseDimensions).forEach(([thickness, rawRule]) => {
    const rule = asRecord(rawRule);

    (['standard', 'withHangingFeet'] as const).forEach((groupKey) => {
      const group = asRecord(rule[groupKey]);
      if (Object.keys(group).length === 0) return;

      (['upper', 'lower'] as const).forEach((section) => {
        const pair = asRecord(group[section]);
        const pairPath = `baseDimensions[${quotePathSegment(thickness)}].${groupKey}.${section}`;
        if (Object.prototype.hasOwnProperty.call(pair, 'base1') && !Number.isFinite(Number(pair.base1))) {
          issues.push(createIssue(`${pairPath}.base1`, 'invalid-number', 'base1 必须是数字'));
        }
        if (Object.prototype.hasOwnProperty.call(pair, 'base2') && !Number.isFinite(Number(pair.base2))) {
          issues.push(createIssue(`${pairPath}.base2`, 'invalid-number', 'base2 必须是数字'));
        }
      });
    });
  });
}

function validateRawLockForkHighHeightRules(value: unknown, issues: MappingValidationIssue[]) {
  const rules = asRecord(asRecord(value).highHeightRules);

  Object.entries(rules).forEach(([thickness, rawRule]) => {
    const rule = asRecord(rawRule);
    const path = `highHeightRules[${quotePathSegment(thickness)}]`;

    if (Object.prototype.hasOwnProperty.call(rule, 'minHeight')
      && (!toTrimmedString(rule.minHeight) || !Number.isFinite(Number(rule.minHeight)))) {
      issues.push(createIssue(`${path}.minHeight`, 'invalid-number', 'minHeight 必须是数字'));
    }
    if (Object.prototype.hasOwnProperty.call(rule, 'heightReference')
      && (!toTrimmedString(rule.heightReference) || !Number.isFinite(Number(rule.heightReference)))) {
      issues.push(createIssue(`${path}.heightReference`, 'invalid-number', 'heightReference 必须是数字'));
    }

    (['standard', 'withHangingFeet'] as const).forEach((groupKey) => {
      const group = asRecord(rule[groupKey]);
      if (Object.keys(group).length === 0) return;

      (['upper', 'lower'] as const).forEach((section) => {
        const pair = asRecord(group[section]);
        const pairPath = `${path}.${groupKey}.${section}`;
        if (Object.prototype.hasOwnProperty.call(pair, 'base1') && !Number.isFinite(Number(pair.base1))) {
          issues.push(createIssue(`${pairPath}.base1`, 'invalid-number', 'base1 必须是数字'));
        }
        if (Object.prototype.hasOwnProperty.call(pair, 'base2') && !Number.isFinite(Number(pair.base2))) {
          issues.push(createIssue(`${pairPath}.base2`, 'invalid-number', 'base2 必须是数字'));
        }
      });
    });
  });
}

function validateRawLockForkEdgeTypes(value: unknown, issues: MappingValidationIssue[]) {
  const edgeTypes = asRecord(asRecord(value).edgeTypes);

  Object.entries(edgeTypes).forEach(([name, rawRule]) => {
    const rule = asRecord(rawRule);
    if (!isPlainObject(rawRule) || !toTrimmedString(rule.nameModifier)) {
      issues.push(createIssue(`edgeTypes[${quotePathSegment(name)}].nameModifier`, 'required', 'nameModifier 不能为空'));
    }
  });
}

export function validateLockForkMapping(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '锁叉映射必须是对象'));
    return issues;
  }

  const adapted = adaptLockForkMapping(value);
  validateRawLockForkBaseDimensions(value, issues);
  validateRawLockForkHighHeightRules(value, issues);
  validateRawLockForkEdgeTypes(value, issues);

  Object.entries(adapted.baseDimensions).forEach(([thickness, dimension]) => {
    validateLockForkDimensionGroup(`baseDimensions[${quotePathSegment(thickness)}]`, dimension, issues);
  });
  Object.entries(adapted.highHeightRules).forEach(([thickness, rule]) => {
    validateLockForkHighHeightRule(`highHeightRules[${quotePathSegment(thickness)}]`, rule, issues);
  });

  Object.entries(adapted.lockTypes).forEach(([name, rule]) => {
    const path = `lockTypes[${quotePathSegment(name)}]`;
    if (!rule.category && !rule.nameModifier && !rule.upper && !rule.lower) {
      issues.push(createIssue(path, 'required', 'lockType 至少需要一个有效字段'));
    }
  });

  Object.entries(adapted.edgeTypes).forEach(([name, rule]) => {
    if (!rule.nameModifier) {
      issues.push(createIssue(`edgeTypes[${quotePathSegment(name)}].nameModifier`, 'required', 'nameModifier 不能为空'));
    }
  });

  if (!Number.isFinite(adapted.hangingFeet.standard)) {
    issues.push(createIssue('hangingFeet.standard', 'invalid-number', 'standard 必须是数字'));
  }
  const rawHangingFeet = asRecord(asRecord(value).hangingFeet);
  if (Object.prototype.hasOwnProperty.call(rawHangingFeet, 'standard')
    && !Number.isFinite(Number(rawHangingFeet.standard))) {
    issues.push(createIssue('hangingFeet.standard', 'invalid-number', 'standard 必须是数字'));
  }
  if (Object.prototype.hasOwnProperty.call(rawHangingFeet, 'keywords') && !Array.isArray(rawHangingFeet.keywords)) {
    issues.push(createIssue('hangingFeet.keywords', 'invalid-type', 'keywords 必须是数组'));
  }
  if (Array.isArray(rawHangingFeet.keywords) && rawHangingFeet.keywords.length === 0) {
    issues.push(createIssue('hangingFeet.keywords', 'required', 'keywords 不能为空'));
  }
  adapted.hangingFeet.keywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`hangingFeet.keywords[${index}]`, 'required', 'keyword 不能为空'));
    }
  });

  if (!Number.isFinite(adapted.heightReference)) {
    issues.push(createIssue('heightReference', 'invalid-number', 'heightReference 必须是数字'));
  }

  if (!adapted.suppliers.default) {
    issues.push(createIssue('suppliers["default"]', 'required', 'default supplier 不能为空'));
  }

  return issues;
}

export function validateHandleMapping(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '拉手映射必须是对象'));
    return issues;
  }

  const rawRecord = asRecord(value);
  if (Object.prototype.hasOwnProperty.call(rawRecord, 'defaultSupplier') && !toTrimmedString(rawRecord.defaultSupplier)) {
    issues.push(createIssue('defaultSupplier', 'required', 'defaultSupplier 不能为空'));
  }
  if (Object.prototype.hasOwnProperty.call(rawRecord, 'unmatchedSupplier') && !toTrimmedString(rawRecord.unmatchedSupplier)) {
    issues.push(createIssue('unmatchedSupplier', 'required', 'unmatchedSupplier 不能为空'));
  }
  if (Object.prototype.hasOwnProperty.call(rawRecord, 'manualReviewLabel') && !toTrimmedString(rawRecord.manualReviewLabel)) {
    issues.push(createIssue('manualReviewLabel', 'required', 'manualReviewLabel 不能为空'));
  }

  const adapted = adaptHandleMapping(value);

  if (!adapted.defaultSupplier) {
    issues.push(createIssue('defaultSupplier', 'required', 'defaultSupplier 不能为空'));
  }
  if (!adapted.unmatchedSupplier) {
    issues.push(createIssue('unmatchedSupplier', 'required', 'unmatchedSupplier 不能为空'));
  }
  if (!adapted.manualReviewLabel) {
    issues.push(createIssue('manualReviewLabel', 'required', 'manualReviewLabel 不能为空'));
  }

  if (asRecord(value).singleKeywords !== undefined && !Array.isArray(asRecord(value).singleKeywords)) {
    issues.push(createIssue('singleKeywords', 'invalid-type', 'singleKeywords 必须是数组'));
  }
  if (asRecord(value).doubleKeywords !== undefined && !Array.isArray(asRecord(value).doubleKeywords)) {
    issues.push(createIssue('doubleKeywords', 'invalid-type', 'doubleKeywords 必须是数组'));
  }
  if (asRecord(value).exportCustomerKeywords !== undefined && !Array.isArray(asRecord(value).exportCustomerKeywords)) {
    issues.push(createIssue('exportCustomerKeywords', 'invalid-type', 'exportCustomerKeywords 必须是数组'));
  }
  if (asRecord(value).placeholderKeywords !== undefined && !Array.isArray(asRecord(value).placeholderKeywords)) {
    issues.push(createIssue('placeholderKeywords', 'invalid-type', 'placeholderKeywords 必须是数组'));
  }
  if (asRecord(value).fallbackModelSources !== undefined && !Array.isArray(asRecord(value).fallbackModelSources)) {
    issues.push(createIssue('fallbackModelSources', 'invalid-type', 'fallbackModelSources 必须是数组'));
  }

  const keywordSeen = new Set<string>();
  adapted.singleKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`singleKeywords[${index}]`, 'required', 'singleKeywords 不能为空字符串'));
      return;
    }
    const normalized = normalizeHandleMappingKey(keyword);
    if (keywordSeen.has(normalized)) {
      issues.push(createIssue(`singleKeywords[${index}]`, 'duplicate', '单双活关键词不能重复'));
      return;
    }
    keywordSeen.add(normalized);
  });

  adapted.doubleKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`doubleKeywords[${index}]`, 'required', 'doubleKeywords 不能为空字符串'));
      return;
    }
    const normalized = normalizeHandleMappingKey(keyword);
    if (keywordSeen.has(normalized)) {
      issues.push(createIssue(`doubleKeywords[${index}]`, 'duplicate', '单双活关键词不能重复'));
      return;
    }
    keywordSeen.add(normalized);
  });

  const exportKeywordSeen = new Set<string>();
  adapted.exportCustomerKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`exportCustomerKeywords[${index}]`, 'required', 'exportCustomerKeywords 不能为空字符串'));
      return;
    }
    const normalized = normalizeHandleMappingKey(keyword);
    if (exportKeywordSeen.has(normalized)) {
      issues.push(createIssue(`exportCustomerKeywords[${index}]`, 'duplicate', 'exportCustomerKeywords 存在重复值'));
      return;
    }
    exportKeywordSeen.add(normalized);
  });

  const placeholderKeywordSeen = new Set<string>();
  adapted.placeholderKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`placeholderKeywords[${index}]`, 'required', 'placeholderKeywords 不能为空字符串'));
      return;
    }
    const normalized = normalizeHandleMappingKey(keyword);
    if (placeholderKeywordSeen.has(normalized)) {
      issues.push(createIssue(`placeholderKeywords[${index}]`, 'duplicate', 'placeholderKeywords 存在重复值'));
      return;
    }
    placeholderKeywordSeen.add(normalized);
  });

  const fallbackSourceSeen = new Set<string>();
  adapted.fallbackModelSources.forEach((source, index) => {
    if (source !== 'remark' && source !== 'xsbz') {
      issues.push(createIssue(`fallbackModelSources[${index}]`, 'invalid-value', 'fallbackModelSources 仅允许 remark 或 xsbz'));
      return;
    }
    if (fallbackSourceSeen.has(source)) {
      issues.push(createIssue(`fallbackModelSources[${index}]`, 'duplicate', 'fallbackModelSources 存在重复值'));
      return;
    }
    fallbackSourceSeen.add(source);
  });

  if (!['single', 'double'].includes(adapted.defaultActivityForExport)) {
    issues.push(createIssue('defaultActivityForExport', 'invalid-value', 'defaultActivityForExport 必须为 single 或 double'));
  }

  if (asRecord(value).thicknessAccessoryPacks !== undefined && !isPlainObject(asRecord(value).thicknessAccessoryPacks)) {
    issues.push(createIssue('thicknessAccessoryPacks', 'invalid-type', 'thicknessAccessoryPacks 必须是对象'));
  }

  (['5', '7', '9', '10'] as const).forEach((thickness) => {
    if (!adapted.thicknessAccessoryPacks[thickness]) {
      issues.push(createIssue(`thicknessAccessoryPacks[${quotePathSegment(thickness)}]`, 'required', `${thickness}cm 配件包不能为空`));
    }
  });

  if (asRecord(value).mappings !== undefined && !isPlainObject(asRecord(value).mappings)) {
    issues.push(createIssue('mappings', 'invalid-type', 'mappings 必须是对象'));
    return issues;
  }

  const rawMappings = asRecord(asRecord(value).mappings);
  Object.entries(rawMappings).forEach(([name, rawEntry]) => {
    const entry = asRecord(rawEntry);
    const path = `mappings[${quotePathSegment(name)}]`;
    if (!isPlainObject(rawEntry)) {
      issues.push(createIssue(path, 'invalid-type', 'mapping entry 必须是对象'));
      return;
    }
    if (!toTrimmedString(entry.supplier)) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    const vendorName = toTrimmedString(entry.vendorName)
      || toTrimmedString(entry.vendorNameSingle)
      || toTrimmedString(entry.vendorNameDouble);
    if (!vendorName) {
      issues.push(createIssue(`${path}.vendorName`, 'required', 'vendorName 不能为空'));
    }
    if (entry.materialCode !== undefined && !toTrimmedString(entry.materialCode)) {
      issues.push(createIssue(`${path}.materialCode`, 'required', 'materialCode 不能为空字符串'));
    }
  });

  const mappingSeen = new Map<string, string>();
  Object.entries(adapted.mappings).forEach(([name, mapping]) => {
    const path = `mappings[${quotePathSegment(name)}]`;
    const normalized = normalizeHandleMappingKey(name);
    const existing = mappingSeen.get(normalized);
    if (existing && existing !== name) {
      issues.push(createIssue(path, 'normalized-conflict', '拉手型号存在 normalize 后冲突'));
    } else {
      mappingSeen.set(normalized, name);
    }

    if (!mapping.supplier) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!mapping.vendorName) {
      issues.push(createIssue(`${path}.vendorName`, 'required', 'vendorName 不能为空'));
    }
  });

  return issues;
}

export function validateLockMapping(value: unknown): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = [];
  const adapted = adaptLockMapping(value);

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '锁具映射必须是对象'));
    return issues;
  }

  const mappingSeen = new Map<string, string>();
  Object.entries(adapted.mappings).forEach(([name, mapping]) => {
    const path = `mappings[${quotePathSegment(name)}]`;
    const normalized = normalizeLockMappingKey(name);
    const existing = mappingSeen.get(normalized);
    if (existing && existing !== name) {
      issues.push(createIssue(path, 'normalized-conflict', '锁具型号存在 normalize 后冲突'));
    } else {
      mappingSeen.set(normalized, name);
    }

    if (!mapping.supplier) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!mapping.vendorName) {
      issues.push(createIssue(`${path}.vendorName`, 'required', 'vendorName 不能为空'));
    }
  });

  return issues;
}

export function validateRuntimeMapping(
  kind: 'packaging',
  value: unknown,
): MappingValidationIssue[];
export function validateRuntimeMapping(
  kind: 'cylinder',
  value: unknown,
): MappingValidationIssue[];
export function validateRuntimeMapping(
  kind: 'lockFork',
  value: unknown,
): MappingValidationIssue[];
export function validateRuntimeMapping(
  kind: 'lock',
  value: unknown,
): MappingValidationIssue[];
export function validateRuntimeMapping(
  kind: 'handle',
  value: unknown,
): MappingValidationIssue[];
export function validateRuntimeMapping(kind: 'packaging' | 'cylinder' | 'lockFork' | 'handle' | 'lock', value: unknown) {
  if (kind === 'packaging') return validatePackagingMapping(value);
  if (kind === 'cylinder') return validateCylinderMapping(value);
  if (kind === 'lock') return validateLockMapping(value);
  if (kind === 'handle') return validateHandleMapping(value);
  return validateLockForkMapping(value);
}

export function isValidPackagingMapping(value: unknown): value is PackagingMappingConfig {
  return validatePackagingMapping(value).length === 0;
}

export function isValidCylinderMapping(value: unknown): value is CylinderMappingConfig {
  return validateCylinderMapping(value).length === 0;
}

export function isValidLockForkMapping(value: unknown): value is LockForkMappingConfig {
  return validateLockForkMapping(value).length === 0;
}

export function isValidHandleMapping(value: unknown): value is HandleMappingConfig {
  return validateHandleMapping(value).length === 0;
}

export function isValidLockMapping(value: unknown): value is LockMappingConfig {
  return validateLockMapping(value).length === 0;
}
