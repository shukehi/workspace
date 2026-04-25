import type { OrderItem } from '@/types/order';

export type OrderItemDropPlacement = 'before' | 'after';

function resolveItemKey(item: Partial<OrderItem>) {
  return String(item.item_key || '').trim();
}

export function removeOrderItemByKey<T extends Partial<OrderItem>>(items: T[] | undefined, itemKey: string) {
  const list = Array.isArray(items) ? [...items] : [];
  if (list.length <= 1) return list;

  const index = list.findIndex((item) => resolveItemKey(item) === itemKey);
  if (index < 0) return list;

  list.splice(index, 1);
  return list;
}

export function reorderOrderItemsByKey<T extends Partial<OrderItem>>(
  items: T[] | undefined,
  payload: {
    sourceItemKey: string;
    targetItemKey: string;
    placement: OrderItemDropPlacement;
  },
) {
  const list = Array.isArray(items) ? [...items] : [];
  const sourceIndex = list.findIndex((item) => resolveItemKey(item) === payload.sourceItemKey);
  const targetIndex = list.findIndex((item) => resolveItemKey(item) === payload.targetItemKey);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return list;
  }

  const [moved] = list.splice(sourceIndex, 1);
  let insertIndex = targetIndex;

  if (sourceIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (payload.placement === 'after') {
    insertIndex += 1;
  }

  if (insertIndex < 0) insertIndex = 0;
  if (insertIndex > list.length) insertIndex = list.length;

  list.splice(insertIndex, 0, moved);
  return list;
}
