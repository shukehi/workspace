export const ORDER_STATUSES = [
  'draft',
  'submitted',
  'processing',
  'arrived',
  'completed',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PENDING_STATUSES: readonly OrderStatus[] = [
  'draft',
  'submitted',
  'processing',
  'arrived',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: '草稿',
  submitted: '已提交',
  processing: '处理中',
  arrived: '已到货',
  completed: '已入库',
  cancelled: '已取消',
};
