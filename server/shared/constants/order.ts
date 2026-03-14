const ORDER_STATUSES = [
    'draft',
    'submitted',
    'processing',
    'arrived',
    'completed',
    'cancelled',
] as const;

type OrderStatus = typeof ORDER_STATUSES[number];

const ORDER_PENDING_STATUSES: readonly OrderStatus[] = [
    'draft',
    'submitted',
    'processing',
    'arrived',
];

module.exports = {
    ORDER_STATUSES,
    ORDER_PENDING_STATUSES,
};
