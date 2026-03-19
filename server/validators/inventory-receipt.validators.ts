interface ValidationIssue {
    field: string;
    message: string;
}

type UnknownRecord = Record<string, unknown>;

export function createIssue(field: string, message: string): ValidationIssue {
    return { field, message };
}

export function isPlainObject(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function pushIfPresentIsNotString(issues: ValidationIssue[], source: UnknownRecord, field: string): void {
    if (source[field] !== undefined && source[field] !== null && typeof source[field] !== 'string') {
        issues.push(createIssue(field, `${field} must be a string`));
    }
}

export function pushIfPresentIsNotPositiveInteger(issues: ValidationIssue[], source: UnknownRecord, field: string): void {
    if (source[field] === undefined) return;
    const raw = String(source[field]).trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

export function pushIfPresentIsNotPositiveNumber(issues: ValidationIssue[], source: UnknownRecord, field: string): void {
    if (source[field] === undefined || source[field] === null || source[field] === '') return;
    const numeric = Number(source[field]);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive number`));
    }
}

export function validateInventoryReceiptIdParams(params: UnknownRecord = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    pushIfPresentIsNotPositiveInteger(issues, params, 'id');
    if (params.id === undefined || params.id === null || String(params.id).trim() === '') {
        return [createIssue('id', 'Receipt id is required')];
    }
    return issues;
}

export function validateInventoryReceiptListQuery(query: UnknownRecord = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    pushIfPresentIsNotPositiveInteger(issues, query, 'orderId');
    pushIfPresentIsNotPositiveInteger(issues, query, 'page');
    pushIfPresentIsNotPositiveInteger(issues, query, 'pageSize');
    pushIfPresentIsNotString(issues, query, 'orderNo');
    pushIfPresentIsNotString(issues, query, 'direction');
    pushIfPresentIsNotString(issues, query, 'reverseReason');
    pushIfPresentIsNotString(issues, query, 'keyword');
    return issues;
}

export function validateInventoryReceiptReverseBody(body: unknown): ValidationIssue[] {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    pushIfPresentIsNotString(issues, body, 'reversed_at');
    pushIfPresentIsNotString(issues, body, 'receipt_date');
    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'reverse_reason');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotPositiveNumber(issues, body, 'quantity');
    return issues;
}

