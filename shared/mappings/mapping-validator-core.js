const {
  adaptCylinderMapping,
  adaptLockMapping,
  adaptLockForkMapping,
  adaptPackagingMapping,
  normalizeLockMappingKey,
  normalizePackagingMappingKey,
} = require('./mapping-adapter-core');
const {
  asRecord,
  toTrimmedString,
  isPlainObject,
  quotePathSegment,
  createIssue,
} = require('./mapping-common');

function normalizeCylinderExcludeKey(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

function normalizeCylinderLogoKey(input) {
  return String(input || '')
    .trim()
    .toUpperCase();
}

function getPackagingMappingSource(value) {
  const record = asRecord(value);
  if (Object.prototype.hasOwnProperty.call(record, 'mappings')) {
    return asRecord(record.mappings);
  }
  if (Object.prototype.hasOwnProperty.call(record, 'supplierName')) {
    return {};
  }
  return record;
}

function validatePackagingMapping(value) {
  const issues = [];
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
  const normalizedMap = new Map();

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

function validateLockMapping(value) {
  const issues = [];
  const adapted = adaptLockMapping(value);

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '锁具映射必须是对象'));
    return issues;
  }

  if (asRecord(value).mappings !== undefined && !isPlainObject(asRecord(value).mappings)) {
    issues.push(createIssue('mappings', 'invalid-type', 'mappings 必须是对象'));
    return issues;
  }

  const mappingSeen = new Map();
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

function validateCylinderDimensionMap(path, dimensions, issues) {
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

function validateCylinderRuleGroup(path, rules, validThicknessSet, issues) {
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

function validateCylinderAccessoryPackRules(path, rules, issues) {
  rules.forEach((rule, index) => {
    const rulePath = `${path}[${index}]`;
    const rawRule = asRecord(rule);
    const conditionField = toTrimmedString(rawRule.conditionField);
    const keyword = toTrimmedString(rawRule.keyword);
    const supplier = toTrimmedString(rawRule.supplier);
    const packs = asRecord(rawRule.thicknessAccessoryPacks);
    const codes = asRecord(rawRule.thicknessMaterialCodes);

    if (!conditionField) {
      issues.push(createIssue(`${rulePath}.conditionField`, 'required', 'conditionField 不能为空'));
    }
    if (!keyword) {
      issues.push(createIssue(`${rulePath}.keyword`, 'required', 'keyword 不能为空'));
    }
    if (!supplier) {
      issues.push(createIssue(`${rulePath}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!isPlainObject(rawRule.thicknessAccessoryPacks)) {
      issues.push(createIssue(`${rulePath}.thicknessAccessoryPacks`, 'invalid-type', 'thicknessAccessoryPacks 必须是对象'));
      return;
    }
    if (Object.keys(packs).length === 0) {
      issues.push(createIssue(`${rulePath}.thicknessAccessoryPacks`, 'required', 'thicknessAccessoryPacks 不能为空'));
      return;
    }
    if (!isPlainObject(rawRule.thicknessMaterialCodes)) {
      issues.push(createIssue(`${rulePath}.thicknessMaterialCodes`, 'invalid-type', 'thicknessMaterialCodes 必须是对象'));
      return;
    }

    Object.entries(packs).forEach(([thickness, label]) => {
      if (!toTrimmedString(thickness)) {
        issues.push(createIssue(`${rulePath}.thicknessAccessoryPacks`, 'required', '门厚 key 不能为空'));
      }
      if (!toTrimmedString(label)) {
        issues.push(createIssue(`${rulePath}.thicknessAccessoryPacks[${quotePathSegment(thickness)}]`, 'required', '配件包名称不能为空'));
      }
      if (!toTrimmedString(codes[thickness])) {
        issues.push(createIssue(`${rulePath}.thicknessMaterialCodes[${quotePathSegment(thickness)}]`, 'required', '物料编码不能为空'));
      }
    });
  });
}

function validateRawCylinderMappings(value, issues) {
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

function validateCylinderMapping(value) {
  const issues = [];
  const rawRecord = asRecord(value);

  if (!isPlainObject(value)) {
    issues.push(createIssue('$', 'invalid-type', '锁芯映射必须是对象'));
    return issues;
  }

  const adapted = adaptCylinderMapping(value);
  validateRawCylinderMappings(value, issues);
  validateCylinderDimensionMap('dimensions', adapted.dimensions, issues);
  validateCylinderDimensionMap('secondaryDimensions', adapted.secondaryDimensions, issues);
  validateCylinderRuleGroup('specialRules', Array.isArray(rawRecord.specialRules) ? rawRecord.specialRules : [], new Set(Object.keys(adapted.dimensions)), issues);
  validateCylinderRuleGroup('secondarySpecialRules', Array.isArray(rawRecord.secondarySpecialRules) ? rawRecord.secondarySpecialRules : [], new Set(Object.keys(adapted.secondaryDimensions)), issues);
  validateCylinderAccessoryPackRules('secondaryAccessoryPackRules', Array.isArray(rawRecord.secondaryAccessoryPackRules) ? rawRecord.secondaryAccessoryPackRules : [], issues);

  Object.entries(adapted.mappings).forEach(([name, mapping]) => {
    const path = `mappings[${quotePathSegment(name)}]`;
    if (!mapping.supplier) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!mapping.template) {
      issues.push(createIssue(`${path}.template`, 'required', 'template 不能为空'));
    }
  });

  if (asRecord(value).customLogos !== undefined && !Array.isArray(asRecord(value).customLogos)) {
    issues.push(createIssue('customLogos', 'invalid-type', 'customLogos 必须是数组'));
  }

  const logoSeen = new Set();
  adapted.customLogos.forEach((logo, index) => {
    if (!logo) {
      issues.push(createIssue(`customLogos[${index}]`, 'required', 'customLogos 不能为空字符串'));
      return;
    }
    const normalized = normalizeCylinderLogoKey(logo);
    if (logoSeen.has(normalized)) {
      issues.push(createIssue(`customLogos[${index}]`, 'duplicate', 'customLogos 存在重复值'));
      return;
    }
    logoSeen.add(normalized);
  });

  if (asRecord(value).excludedCylinders !== undefined && !Array.isArray(asRecord(value).excludedCylinders)) {
    issues.push(createIssue('excludedCylinders', 'invalid-type', 'excludedCylinders 必须是数组'));
  }

  if (Array.isArray(asRecord(value).excludedCylinders)) {
    const excludedSeen = new Set();
    asRecord(value).excludedCylinders.forEach((rawName, index) => {
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

function validateLockForkDimensionGroup(path, value, issues) {
  if (!value) {
    issues.push(createIssue(path, 'required', '基础尺寸不能为空'));
    return;
  }

  ['standard', 'withHangingFeet'].forEach((key) => {
    const group = value[key];
    if (!group) return;

    ['upper', 'lower'].forEach((section) => {
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

function validateLockForkHighHeightRule(path, value, issues) {
  if (!Number.isFinite(value.minHeight)) {
    issues.push(createIssue(`${path}.minHeight`, 'invalid-number', 'minHeight 必须是数字'));
  }
  if (!Number.isFinite(value.heightReference)) {
    issues.push(createIssue(`${path}.heightReference`, 'invalid-number', 'heightReference 必须是数字'));
  }
  validateLockForkDimensionGroup(path, value, issues);
}

function validateRawLockForkBaseDimensions(value, issues) {
  const baseDimensions = asRecord(asRecord(value).baseDimensions);

  Object.entries(baseDimensions).forEach(([thickness, rawRule]) => {
    const rule = asRecord(rawRule);

    ['standard', 'withHangingFeet'].forEach((groupKey) => {
      const group = asRecord(rule[groupKey]);
      if (Object.keys(group).length === 0) return;

      ['upper', 'lower'].forEach((section) => {
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

function validateRawLockForkHighHeightRules(value, issues) {
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

    ['standard', 'withHangingFeet'].forEach((groupKey) => {
      const group = asRecord(rule[groupKey]);
      if (Object.keys(group).length === 0) return;

      ['upper', 'lower'].forEach((section) => {
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

function validateRawLockForkEdgeTypes(value, issues) {
  const edgeTypes = asRecord(asRecord(value).edgeTypes);

  Object.entries(edgeTypes).forEach(([name, rawRule]) => {
    const rule = asRecord(rawRule);
    if (!isPlainObject(rawRule) || !toTrimmedString(rule.nameModifier)) {
      issues.push(createIssue(`edgeTypes[${quotePathSegment(name)}].nameModifier`, 'required', 'nameModifier 不能为空'));
    }
  });
}

function validateLockForkMapping(value) {
  const issues = [];

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

module.exports = {
  validatePackagingMapping,
  validateCylinderMapping,
  validateLockMapping,
  validateLockForkMapping,
};
