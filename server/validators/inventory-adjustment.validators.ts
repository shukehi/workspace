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

export function validateInventoryAdjustmentCreateBody(body: unknown) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    pushIfNotPositiveInteger(issues, body.material_id, 'material_id');
    pushIfNotPositiveInteger(issues, body.warehouse_id, 'warehouse_id');
    pushIfNotPositiveInteger(issues, body.location_id, 'location_id');
    if (!String(body.operation_key || '').trim()) {
        issues.push(createIssue('operation_key', 'operation_key is required'));
    }

    const delta = Number(body.delta_quantity);
    if (!Number.isFinite(delta) || delta === 0) {
        issues.push(createIssue('delta_quantity', 'delta_quantity must be a non-zero number'));
    }

    if (!String(body.reason || '').trim()) {
        issues.push(createIssue('reason', 'reason is required'));
    }

    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotString(issues, body, 'occurred_at');
    return issues;
}
