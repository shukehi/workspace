import type { Order, OrderItem } from '@/types/order';
import { normalizePrintCategory } from '@/features/procurement/docModel';
import { syncOrderItemQuantity } from '@/features/procurement/order-sheet.schema';
import { normalizeTemplateType } from '@/features/procurement/templateType';

let draftItemKeySequence = 0;

export function createDraftItemKey() {
  draftItemKeySequence += 1;
  return `draft-item-${draftItemKeySequence}`;
}

function resolveStableItemKey(item: Partial<OrderItem>) {
  const existingItemKey = String(item.item_key || '').trim();
  if (existingItemKey) return existingItemKey;

  const numericId = Number(item.id || 0);
  if (Number.isInteger(numericId) && numericId > 0) {
    return `order-item-${numericId}`;
  }

  return createDraftItemKey();
}

export function cloneOrderDraft(order: Order): Order {
  return JSON.parse(JSON.stringify(order)) as Order;
}

export function normalizeOrderDraft(order: Order): Order {
  const draft = cloneOrderDraft(order);
  if (!draft.metadata) draft.metadata = {};
  const category = normalizePrintCategory(draft.category);
  draft.metadata.template_type = normalizeTemplateType(draft.metadata.template_type, draft.category);

  draft.items = (draft.items || []).map((item) => {
    const normalizedItem = syncOrderItemQuantity({
      ...item,
      item_key: resolveStableItemKey(item),
      spec: item.spec || item.model || '-',
      mb: item.mb || item.orientation || '-'
    }, category);
    return normalizedItem;
  });

  return draft;
}
