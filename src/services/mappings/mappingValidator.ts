import {
  adaptHandleMapping,
} from '@/services/mappings/mappingAdapter';
import type {
  HandleMappingConfig,
  MappingValidationIssue,
} from '@/types/mapping';

// @ts-ignore shared ESM validator core is consumed by both frontend and backend
import * as sharedMappingValidatorCore from '../../../shared/mappings/mapping-validator-core.mjs';

const {
  validatePackagingMapping: validatePackagingMappingShared,
  validateCylinderMapping: validateCylinderMappingShared,
  validateLockMapping: validateLockMappingShared,
  validateLockForkMapping: validateLockForkMappingShared,
} = sharedMappingValidatorCore;

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

function normalizeHandleMappingKey(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[（【［]/g, '(')
    .replace(/[）】］]/g, ')')
    .replace(/\s+/g, '');
}

export function validatePackagingMapping(value: unknown): MappingValidationIssue[] {
  return validatePackagingMappingShared(value) as MappingValidationIssue[];
}

export function validateCylinderMapping(value: unknown): MappingValidationIssue[] {
  return validateCylinderMappingShared(value) as MappingValidationIssue[];
}

export function validateLockMapping(value: unknown): MappingValidationIssue[] {
  return validateLockMappingShared(value) as MappingValidationIssue[];
}

export function validateLockForkMapping(value: unknown): MappingValidationIssue[] {
  return validateLockForkMappingShared(value) as MappingValidationIssue[];
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

  const adapted: HandleMappingConfig = adaptHandleMapping(value);

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

  adapted.exportCustomerKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`exportCustomerKeywords[${index}]`, 'required', 'exportCustomerKeywords 不能为空字符串'));
    }
  });

  adapted.placeholderKeywords.forEach((keyword, index) => {
    if (!keyword) {
      issues.push(createIssue(`placeholderKeywords[${index}]`, 'required', 'placeholderKeywords 不能为空字符串'));
    }
  });

  adapted.fallbackModelSources.forEach((source, index) => {
    if (source !== 'remark' && source !== 'xsbz') {
      issues.push(createIssue(`fallbackModelSources[${index}]`, 'invalid-value', 'fallbackModelSources 仅支持 remark/xsbz'));
    }
  });

  if (asRecord(value).thicknessAccessoryPacks !== undefined && !isPlainObject(asRecord(value).thicknessAccessoryPacks)) {
    issues.push(createIssue('thicknessAccessoryPacks', 'invalid-type', 'thicknessAccessoryPacks 必须是对象'));
  }

  Object.entries(adapted.thicknessAccessoryPacks).forEach(([thickness, label]) => {
    if (!label) {
      issues.push(createIssue(`thicknessAccessoryPacks[${quotePathSegment(thickness)}]`, 'required', '厚度配件包名称不能为空'));
    }
  });

  if (asRecord(value).mappings !== undefined && !isPlainObject(asRecord(value).mappings)) {
    issues.push(createIssue('mappings', 'invalid-type', 'mappings 必须是对象'));
    return issues;
  }

  Object.entries(adapted.mappings).forEach(([name, mapping]) => {
    const path = `mappings[${quotePathSegment(name)}]`;
    if (!mapping.supplier) {
      issues.push(createIssue(`${path}.supplier`, 'required', 'supplier 不能为空'));
    }
    if (!mapping.vendorName) {
      issues.push(createIssue(`${path}.vendorName`, 'required', 'vendorName 不能为空'));
    }
  });

  return issues;
}
