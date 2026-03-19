export const ORDER_STATUSES = [
    'draft',
    'submitted',
    'processing',
    'arrived',
    'completed',
    'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_PENDING_STATUSES: readonly OrderStatus[] = [
    'draft',
    'submitted',
    'processing',
    'arrived',
];

// 兼容 CommonJS 消费方
