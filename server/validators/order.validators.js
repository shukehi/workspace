function createIssue(field, message) {
    return { field, message };
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateOrderIdParams(params = {}) {
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

function validateObjectBody(body) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }
    return [];
}

function pushIfPresentIsNotArray(issues, body, field) {
    if (body[field] !== undefined && !Array.isArray(body[field])) {
        issues.push(createIssue(field, `${field} must be an array`));
    }
}

function pushIfPresentIsNotNumericString(issues, source, field) {
    if (source[field] === undefined) return;
    const raw = String(source[field]).trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

function pushIfPresentIsNotString(issues, source, field) {
    if (source[field] !== undefined && source[field] !== null && typeof source[field] !== 'string') {
        issues.push(createIssue(field, `${field} must be a string`));
    }
}

function validateOrderListQuery(query = {}) {
    const issues = [];
    pushIfPresentIsNotNumericString(issues, query, 'page');
    pushIfPresentIsNotNumericString(issues, query, 'pageSize');
    pushIfPresentIsNotString(issues, query, 'status');
    pushIfPresentIsNotString(issues, query, 'risk');
    pushIfPresentIsNotString(issues, query, 'createdDate');
    pushIfPresentIsNotString(issues, query, 'keyword');
    pushIfPresentIsNotString(issues, query, 'orderNo');
    pushIfPresentIsNotString(issues, query, 'category');
    return issues;
}

function validateOrderCreateBody(body) {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    pushIfPresentIsNotString(issues, body, 'order_no');
    pushIfPresentIsNotString(issues, body, 'supplier');
    pushIfPresentIsNotString(issues, body, 'category');
    pushIfPresentIsNotString(issues, body, 'status');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotString(issues, body, 'created_at');
    pushIfPresentIsNotString(issues, body, 'delivery_date');
    pushIfPresentIsNotArray(issues, body, 'items');

    return issues;
}

function validateOrderUpdateBody(body) {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    pushIfPresentIsNotString(issues, body, 'supplier');
    pushIfPresentIsNotString(issues, body, 'category');
    pushIfPresentIsNotString(issues, body, 'status');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotString(issues, body, 'created_at');
    pushIfPresentIsNotString(issues, body, 'delivery_date');
    pushIfPresentIsNotString(issues, body, 'arrived_at');
    pushIfPresentIsNotString(issues, body, 'arrived_by');
    pushIfPresentIsNotString(issues, body, 'arrived_remark');
    pushIfPresentIsNotString(issues, body, 'stocked_in_at');
    pushIfPresentIsNotString(issues, body, 'stocked_in_by');
    pushIfPresentIsNotString(issues, body, 'stocked_in_remark');
    pushIfPresentIsNotArray(issues, body, 'items');

    return issues;
}

function validateOrderArriveBody(body) {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    pushIfPresentIsNotString(issues, body, 'arrived_at');
    pushIfPresentIsNotString(issues, body, 'arrived_by');
    pushIfPresentIsNotString(issues, body, 'arrived_remark');
    pushIfPresentIsNotString(issues, body, 'status');

    return issues;
}

function validateOrderStockInBody(body) {
    const issues = validateObjectBody(body);
    if (issues.length > 0) return issues;

    pushIfPresentIsNotString(issues, body, 'stocked_in_at');
    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotArray(issues, body, 'items');

    return issues;
}

module.exports = {
    validateOrderListQuery,
    validateOrderIdParams,
    validateOrderCreateBody,
    validateOrderUpdateBody,
    validateOrderArriveBody,
    validateOrderStockInBody,
};
