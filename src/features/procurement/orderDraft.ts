import type { Order } from '@/types/order';

export function cloneOrderDraft(order: Order): Order {
  return JSON.parse(JSON.stringify(order)) as Order;
}

export function normalizeOrderDraft(order: Order): Order {
  const draft = cloneOrderDraft(order);
  if (!draft.metadata) draft.metadata = {};

  draft.items = (draft.items || []).map((item) => ({
    ...item,
    spec: item.spec || item.model || '-',
    mb: item.mb || item.orientation || '-'
  }));

  return draft;
}
