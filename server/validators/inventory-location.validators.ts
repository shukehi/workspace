interface ValidationIssue {
    field: string;
    message: string;
}

type UnknownRecord = Record<string, unknown>;

function createIssue(field: string, message: string): ValidationIssue {
    return { field, message };
}

function isPlainObject(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pushIfNotPositiveInteger(issues: ValidationIssue[], value: unknown, field: string) {
    const numeric = Number(String(value ?? '').trim());
    if (!Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

function pushIfPresentIsNotString(issues: ValidationIssue[], body: UnknownRecord, field: string) {
    if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string') {
        issues.push(createIssue(field, `${field} must be a string`));
    }
}

export function validateInventoryLocationIdParams(params: UnknownRecord = {}) {
    const issues: ValidationIssue[] = [];
    pushIfNotPositiveInteger(issues, params.id, 'id');
    return issues;
}

export function validateInventoryLocationCreateBody(body: unknown) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    pushIfNotPositiveInteger(issues, body.warehouse_id, 'warehouse_id');
    if (!String(body.code || '').trim()) issues.push(createIssue('code', 'code is required'));
    if (!String(body.name || '').trim()) issues.push(createIssue('name', 'name is required'));
    pushIfPresentIsNotString(issues, body, 'status');
    pushIfPresentIsNotString(issues, body, 'remark');
    if (body.sort_order !== undefined && !Number.isFinite(Number(body.sort_order))) {
        issues.push(createIssue('sort_order', 'sort_order must be a number'));
    }
    return issues;
}

export function validateInventoryLocationUpdateBody(body: unknown) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    if (body.warehouse_id !== undefined) {
        pushIfNotPositiveInteger(issues, body.warehouse_id, 'warehouse_id');
    }
    pushIfPresentIsNotString(issues, body, 'code');
    pushIfPresentIsNotString(issues, body, 'name');
    pushIfPresentIsNotString(issues, body, 'status');
    pushIfPresentIsNotString(issues, body, 'remark');
    if (body.sort_order !== undefined && !Number.isFinite(Number(body.sort_order))) {
        issues.push(createIssue('sort_order', 'sort_order must be a number'));
    }
    return issues;
}
