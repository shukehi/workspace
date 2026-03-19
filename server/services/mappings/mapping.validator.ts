import { adaptHandleMapping } from './mapping.adapter';
import { PROFILE_CODE_LIST } from './mapping.constants';
import { validatePackagingMapping, validateCylinderMapping, validateLockMapping, validateLockForkMapping } from '../../../shared/mappings/mapping-validator-core.mjs';

export { validatePackagingMapping, validateCylinderMapping, validateLockMapping, validateLockForkMapping };

type UnknownRecord = Record<string, unknown>;

interface MappingIssue {
    path: string;
    code: string;
    message: string;
}

export function asRecord(value: unknown): UnknownRecord {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

export function toTrimmedString(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

export function isPlainObject(value: unknown): value is UnknownRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function quotePathSegment(segment: string): string {
    return JSON.stringify(segment);
}

export function createIssue(path: string, code: string, message: string): MappingIssue {
    return { path, code, message };
}

export function normalizeHandleMappingKey(input: unknown): string {
    return String(input || '')
        .trim()
        .toLowerCase()
        .replace(/[（【［]/g, '(')
        .replace(/[）】］]/g, ')')
        .replace(/\s+/g, '');
}

export function validateProfileCode(profileCode: unknown): MappingIssue[] {
    const normalized = String(profileCode || '').trim();
    if ((PROFILE_CODE_LIST as readonly string[]).includes(normalized)) return [];
    return [{
        path: 'profileCode',
        code: 'unsupported-profile',
        message: '不支持的 mapping profile code'
    }];
}

export function parsePayload(payloadText: unknown): UnknownRecord {
    try {
        const parsed = JSON.parse(String(payloadText || '{}'));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as UnknownRecord : {};
    } catch {
        return {};
    }
}

export function serializePayload(payload: unknown): string {
    const normalized = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {};
    return JSON.stringify(normalized);
}

export function validateHandleMapping(value: unknown): MappingIssue[] {
    const issues: MappingIssue[] = [];

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
    adapted.singleKeywords.forEach((keyword: string, index: number) => {
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

    adapted.doubleKeywords.forEach((keyword: string, index: number) => {
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
    adapted.exportCustomerKeywords.forEach((keyword: string, index: number) => {
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
    adapted.placeholderKeywords.forEach((keyword: string, index: number) => {
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
    adapted.fallbackModelSources.forEach((source: string, index: number) => {
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

    ['5', '7', '9', '10'].forEach((thickness) => {
        if (!(adapted.thicknessAccessoryPacks as Record<string, unknown>)[thickness]) {
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
    Object.entries(adapted.mappings).forEach(([name, mapping]: [string, any]) => {
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

export function validateMappingPayload(profileCode: unknown, payload: unknown): MappingIssue[] {
    const normalizedProfileCode = String(profileCode || '').trim();
    const profileCodeErrors = validateProfileCode(normalizedProfileCode);
    if (profileCodeErrors.length > 0) return profileCodeErrors;

    if (normalizedProfileCode === 'packaging') {
        return validatePackagingMapping(payload);
    }
    if (normalizedProfileCode === 'cylinder') {
        return validateCylinderMapping(payload);
    }
    if (normalizedProfileCode === 'lock') {
        return validateLockMapping(payload);
    }
    if (normalizedProfileCode === 'lock_fork') {
        return validateLockForkMapping(payload);
    }
    if (normalizedProfileCode === 'handle') {
        return validateHandleMapping(payload);
    }
    return [{
        path: 'profileCode',
        code: 'unsupported-profile',
        message: '不支持的 mapping profile code'
    }];
}

