export {};

const { ORDER_STATUSES, ORDER_PENDING_STATUSES } = require('../../shared/constants/order');
const { API_ERROR_CODES } = require('../../shared/contracts/api');

type OrderStatus = string;

class InvalidStatusTransitionError extends Error {
    code: string;
    fromStatus: string;
    toStatus: string;

    constructor(fromStatus: string, toStatus: string) {
        super(API_ERROR_CODES.INVALID_STATUS_TRANSITION);
        this.name = 'InvalidStatusTransitionError';
        this.code = API_ERROR_CODES.INVALID_STATUS_TRANSITION;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
    }
}

class OrderEditLockedError extends Error {
    code: string;
    status: string;
    fields: string[];

    constructor(status: string, fields: string[]) {
        super(API_ERROR_CODES.ORDER_EDIT_LOCKED);
        this.name = 'OrderEditLockedError';
        this.code = API_ERROR_CODES.ORDER_EDIT_LOCKED;
        this.status = status;
        this.fields = fields;
    }
}

const ALLOWED_STATUS_TRANSITIONS: Record<string, Set<string>> = {
    draft: new Set(['draft', 'submitted', 'cancelled']),
    submitted: new Set(['submitted', 'processing', 'cancelled']),
    processing: new Set(['processing', 'arrived', 'cancelled']),
    arrived: new Set(['arrived', 'completed', 'cancelled']),
    completed: new Set(['completed']),
    cancelled: new Set(['cancelled', 'draft', 'submitted', 'processing', 'arrived', 'completed'])
};

const ARRIVED_EDITABLE_FIELDS = new Set([
    'status',
    'remark',
    'delivery_date',
    'arrived_at',
    'arrived_by',
    'arrived_remark',
    'stocked_in_at',
    'stocked_in_by',
    'stocked_in_remark'
]);

const COMPLETED_EDITABLE_FIELDS = new Set([
    'status',
    'remark',
    'delivery_date',
    'stocked_in_at',
    'stocked_in_by',
    'stocked_in_remark'
]);

function normalizeStatusValue(status: unknown): string {
    if (status === undefined || status === null) return '';
    return String(status).trim();
}

function normalizeStatus(status: unknown, fallback: OrderStatus = 'draft'): OrderStatus {
    const raw = normalizeStatusValue(status);
    if (!raw) return fallback;
    if (!ORDER_STATUSES.includes(raw)) {
        throw new InvalidStatusTransitionError('unknown', raw);
    }
    return raw;
}

function assertValidStatusTransition(fromStatus: unknown, toStatus: unknown): OrderStatus {
    const normalizedFrom = normalizeStatus(fromStatus);
    const normalizedTo = normalizeStatus(toStatus, normalizedFrom);
    const allowed = ALLOWED_STATUS_TRANSITIONS[normalizedFrom];
    if (!allowed || !allowed.has(normalizedTo)) {
        throw new InvalidStatusTransitionError(normalizedFrom, normalizedTo);
    }
    return normalizedTo;
}

function assertEditableOrderFields(order: { status?: unknown } | null | undefined, data: Record<string, unknown> = {}): void {
    const currentStatus = normalizeStatus(order?.status);
    if (!['arrived', 'completed'].includes(currentStatus)) return;

    const allowedFields = currentStatus === 'arrived'
        ? ARRIVED_EDITABLE_FIELDS
        : COMPLETED_EDITABLE_FIELDS;

    const blockedFields = Object.keys(data || {}).filter((field) => !allowedFields.has(field));
    if (blockedFields.length > 0) {
        throw new OrderEditLockedError(currentStatus, blockedFields);
    }
}

function isPendingOrderStatus(status: string): boolean {
    return ORDER_PENDING_STATUSES.includes(status);
}

module.exports = {
    ORDER_STATUSES,
    ORDER_PENDING_STATUSES,
    ALLOWED_STATUS_TRANSITIONS,
    ARRIVED_EDITABLE_FIELDS,
    COMPLETED_EDITABLE_FIELDS,
    InvalidStatusTransitionError,
    OrderEditLockedError,
    normalizeStatus,
    assertValidStatusTransition,
    assertEditableOrderFields,
    isPendingOrderStatus,
};
