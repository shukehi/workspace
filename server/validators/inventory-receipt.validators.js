function createIssue(field, message) {
    return { field, message };
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pushIfPresentIsNotString(issues, source, field) {
    if (source[field] !== undefined && source[field] !== null && typeof source[field] !== 'string') {
        issues.push(createIssue(field, `${field} must be a string`));
    }
}

function pushIfPresentIsNotPositiveInteger(issues, source, field) {
    if (source[field] === undefined) return;
    const raw = String(source[field]).trim();
    const numeric = Number(raw);
    if (!raw || !Number.isInteger(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive integer`));
    }
}

function pushIfPresentIsNotPositiveNumber(issues, source, field) {
    if (source[field] === undefined || source[field] === null || source[field] === '') return;
    const numeric = Number(source[field]);
    if (!Number.isFinite(numeric) || numeric <= 0) {
        issues.push(createIssue(field, `${field} must be a positive number`));
    }
}

function validateInventoryReceiptIdParams(params = {}) {
    const issues = [];
    pushIfPresentIsNotPositiveInteger(issues, params, 'id');
    if (params.id === undefined || params.id === null || String(params.id).trim() === '') {
        return [createIssue('id', 'Receipt id is required')];
    }
    return issues;
}

function validateInventoryReceiptListQuery(query = {}) {
    const issues = [];
    pushIfPresentIsNotPositiveInteger(issues, query, 'orderId');
    pushIfPresentIsNotPositiveInteger(issues, query, 'page');
    pushIfPresentIsNotPositiveInteger(issues, query, 'pageSize');
    pushIfPresentIsNotString(issues, query, 'orderNo');
    pushIfPresentIsNotString(issues, query, 'direction');
    pushIfPresentIsNotString(issues, query, 'reverseReason');
    pushIfPresentIsNotString(issues, query, 'keyword');
    return issues;
}

function validateInventoryReceiptReverseBody(body) {
    if (!isPlainObject(body)) {
        return [createIssue('$', 'Request body must be an object')];
    }

    const issues = [];
    pushIfPresentIsNotString(issues, body, 'reversed_at');
    pushIfPresentIsNotString(issues, body, 'receipt_date');
    pushIfPresentIsNotString(issues, body, 'operator');
    pushIfPresentIsNotString(issues, body, 'reverse_reason');
    pushIfPresentIsNotString(issues, body, 'remark');
    pushIfPresentIsNotPositiveNumber(issues, body, 'quantity');
    return issues;
}

module.exports = {
    validateInventoryReceiptIdParams,
    validateInventoryReceiptListQuery,
    validateInventoryReceiptReverseBody,
};
