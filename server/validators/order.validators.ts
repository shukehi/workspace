export { };

import { validateManualCreateOrder } from '../services/orders/order-create.validation';

interface ValidationIssue {
    field: string;
    message: string;
}

type UnknownRecord = Record<string, unknown>;

function createIssue(field: string, message: string): ValidationIssue {
    return { field, message };
}

function isPlainObject(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateOrderIdParams(params: UnknownRecord = {}): ValidationIssue[] {
    const value = String(params.id || '').trim();
    if (!value) {
        return [createIssue('id', 'Order id is required')];
    }

    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) {
        return [createIssue('id', 'Order id must be a positive integer')];
    }

    return [];
}

function validateObjectBody(body: unknown): ValidationIssue[] {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }
    return [];
}

function pushIfPresentIsNotArray(issues: ValidationIssue[], body: UnknownRecord, field: string): void {
    if (body[field] !== undefined && !Array.isArray(body[field])) {
        issues.push(createIssue(field, `${field} must be an array`));
    }
}

function pushIfPresentIsNotNumericString(issues: ValidationIssue[], source: UnknownRecord, field: string): void {
    if (source[field] === undefined) return;
    const raw = String(source[field]).trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

function pushIfPresentIsNotString(issues: ValidationIssue[], source: UnknownRecord, field: string): void {
    if (source[field] !== undefined && source[field] !== null && typeof source[field] !== 'string') {
        issues.push(createIssue(field, `${field} must be a string`));
    }
}

function pushIfPresentIsNotPositiveIntegerValue(issues: ValidationIssue[], value: unknown, field: string): void {
    if (value === undefined) return;
    const numeric = Number(String(value).trim());
    if (!Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

export function validateOrderListQuery(query: UnknownRecord = {}): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    pushIfPresentIsNotNumericString(issues, query, 'page');
    pushIfPresentIsNotNumericString(issues, query, 'pageSize');
    pushIfPresentIsNotString(issues, query, 'status');
    pushIfPresentIsNotString(issues, query, 'risk');
    pushIfPresentIsNotString(issues, query, 'createdDate');
    pushIfPresentIsNotString(issues, query, 'keyword');
    pushIfPresentIsNotString(issues, query, 'orderNo');
    pushIfPresentIsNotString(issues, query, 'category');
    pushIfPresentIsNotString(issues, query, 'supplier');
    pushIfPresentIsNotString(issues, query, 'startDate');
    pushIfPresentIsNotString(issues, query, 'endDate');
    return issues;
}

export function validateOrderCreateBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    pushIfPresentIsNotString(issues, payload, 'order_no');
    pushIfPresentIsNotString(issues, payload, 'supplier');
    pushIfPresentIsNotString(issues, payload, 'category');
    pushIfPresentIsNotString(issues, payload, 'status');
    pushIfPresentIsNotString(issues, payload, 'remark');
    pushIfPresentIsNotString(issues, payload, 'created_at');
    pushIfPresentIsNotString(issues, payload, 'delivery_date');
    pushIfPresentIsNotArray(issues, payload, 'items');
    issues.push(...validateManualCreateOrder(payload as any));

    return issues;
}

export function validateOrderUpdateBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    pushIfPresentIsNotString(issues, payload, 'order_no');
    pushIfPresentIsNotString(issues, payload, 'supplier');
    pushIfPresentIsNotString(issues, payload, 'category');
    pushIfPresentIsNotString(issues, payload, 'status');
    pushIfPresentIsNotString(issues, payload, 'remark');
    pushIfPresentIsNotString(issues, payload, 'created_at');
    pushIfPresentIsNotString(issues, payload, 'delivery_date');
    pushIfPresentIsNotString(issues, payload, 'arrived_at');
    pushIfPresentIsNotString(issues, payload, 'arrived_by');
    pushIfPresentIsNotString(issues, payload, 'arrived_remark');
    pushIfPresentIsNotString(issues, payload, 'stocked_in_at');
    pushIfPresentIsNotString(issues, payload, 'stocked_in_by');
    pushIfPresentIsNotString(issues, payload, 'stocked_in_remark');
    pushIfPresentIsNotArray(issues, payload, 'items');

    return issues;
}

export function validateOrderArriveBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    pushIfPresentIsNotString(issues, payload, 'arrived_at');
    pushIfPresentIsNotString(issues, payload, 'arrived_by');
    pushIfPresentIsNotString(issues, payload, 'arrived_remark');
    pushIfPresentIsNotString(issues, payload, 'status');

    return issues;
}

export function validateBulkOrderArriveBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    if (!Array.isArray(payload.ids) || payload.ids.length === 0) {
        issues.push(createIssue('ids', 'ids must be a non-empty array'));
    } else {
        payload.ids.forEach((value, index) => {
            pushIfPresentIsNotPositiveIntegerValue(issues, value, `ids[${index}]`);
        });
    }

    pushIfPresentIsNotString(issues, payload, 'arrived_at');
    pushIfPresentIsNotString(issues, payload, 'arrived_by');
    pushIfPresentIsNotString(issues, payload, 'arrived_remark');

    return issues;
}

export function validateOrderStatusBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    if (!payload.status || typeof payload.status !== 'string' || !(payload.status as string).trim()) {
        issues.push(createIssue('status', 'status is required and must be a non-empty string'));
    }

    return issues;
}

export function validateOrderStockInBody(body: unknown): ValidationIssue[] {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    const payload = body as UnknownRecord;
    pushIfPresentIsNotString(issues, payload, 'stocked_in_at');
    pushIfPresentIsNotString(issues, payload, 'operator');
    pushIfPresentIsNotString(issues, payload, 'remark');
    pushIfPresentIsNotArray(issues, payload, 'items');
    pushIfPresentIsNotPositiveIntegerValue(issues, payload.warehouse_id, 'warehouse_id');
    pushIfPresentIsNotPositiveIntegerValue(issues, payload.location_id, 'location_id');

    return issues;
}
