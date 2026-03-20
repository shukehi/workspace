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

function pushIfPresentIsNotPositiveNumber(issues: ValidationIssue[], value: unknown, field: string) {
    if (value === undefined || value === null || value === '') return;
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive number`));
    }
}

export function validateInventoryOutboundIdParams(params: UnknownRecord = {}) {
    const issues: ValidationIssue[] = [];
    pushIfNotPositiveInteger(issues, params.id, 'id');
    return issues;
}

export function validateInventoryOutboundListQuery(query: UnknownRecord = {}) {
    const issues: ValidationIssue[] = [];
    if (query.page !== undefined) pushIfNotPositiveInteger(issues, query.page, 'page');
    if (query.pageSize !== undefined) pushIfNotPositiveInteger(issues, query.pageSize, 'pageSize');
    if (query.warehouseId !== undefined) pushIfNotPositiveInteger(issues, query.warehouseId, 'warehouseId');
    if (query.locationId !== undefined) pushIfNotPositiveInteger(issues, query.locationId, 'locationId');
    pushIfPresentIsNotString(issues, query, 'outboundNo');
    pushIfPresentIsNotString(issues, query, 'keyword');
    pushIfPresentIsNotString(issues, query, 'operator');
    pushIfPresentIsNotString(issues, query, 'startDate');
    pushIfPresentIsNotString(issues, query, 'endDate');
    return issues;
}

export function validateInventoryOutboundCreateBody(body: unknown) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    pushIfNotPositiveInteger(issues, body.warehouse_id, 'warehouse_id');
    pushIfNotPositiveInteger(issues, body.location_id, 'location_id');
    if (!String(body.reason || '').trim()) issues.push(createIssue('reason', 'reason is required'));
    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotString(issues, body, 'outbound_date');

    if (!Array.isArray(body.items) || body.items.length === 0) {
        issues.push(createIssue('items', 'items must be a non-empty array'));
    } else {
        body.items.forEach((item, index) => {
            if (!isPlainObject(item)) {
                issues.push(createIssue(`items[${index}]`, 'item must be an object'));
                return;
            }
            if (item.material_id === undefined || item.material_id === null || String(item.material_id).trim() === '') {
                issues.push(createIssue(`items[${index}].material_id`, 'material_id is required'));
            }
            pushIfPresentIsNotPositiveNumber(issues, item.quantity, `items[${index}].quantity`);
        });
    }

    return issues;
}

export function validateInventoryOutboundReverseBody(body: unknown) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues: ValidationIssue[] = [];
    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotString(issues, body, 'reason');
    pushIfPresentIsNotString(issues, body, 'outbound_date');
    return issues;
}
