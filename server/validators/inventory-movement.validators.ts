interface ValidationIssue {
    field: string;
    message: string;
}

type UnknownRecord = Record<string, unknown>;

function createIssue(field: string, message: string): ValidationIssue {
    return { field, message };
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

export function validateInventoryMovementListQuery(query: UnknownRecord = {}) {
    const issues: ValidationIssue[] = [];
    if (query.page !== undefined) pushIfNotPositiveInteger(issues, query.page, 'page');
    if (query.pageSize !== undefined) pushIfNotPositiveInteger(issues, query.pageSize, 'pageSize');
    if (query.materialId !== undefined) pushIfNotPositiveInteger(issues, query.materialId, 'materialId');
    if (query.warehouseId !== undefined) pushIfNotPositiveInteger(issues, query.warehouseId, 'warehouseId');
    if (query.locationId !== undefined) pushIfNotPositiveInteger(issues, query.locationId, 'locationId');
    pushIfPresentIsNotString(issues, query, 'sourceType');
    pushIfPresentIsNotString(issues, query, 'keyword');
    pushIfPresentIsNotString(issues, query, 'startDate');
    pushIfPresentIsNotString(issues, query, 'endDate');
    return issues;
}
