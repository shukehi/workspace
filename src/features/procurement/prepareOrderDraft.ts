import { packagingMatcher } from '@/lib/packagingMatcher';
import { getPackagingMapping } from '@/services/packagingConfig';
import type { Order } from '@/types/order';
import { normalizeOrderDraft, cloneOrderDraft } from '@/features/procurement/orderDraft';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';

export function prepareOrderDraft(order: Order): Order {
  const draft = cloneOrderDraft(order);
  if (!draft.metadata) draft.metadata = {};

  const isPackagingOrder = draft.category && String(draft.category).includes('包装');
  if (isPackagingOrder) {
    const packagingMapping = getPackagingMapping();
    const names = resolvePackagingHeaderNames(
      draft,
      packagingMapping,
      packagingMatcher
    );
    draft.metadata.internal_name = names.internalName;
    draft.metadata.external_name = names.externalName;

    if (!draft.supplier) {
      draft.supplier = packagingMapping?.supplierName || '默认供应商';
    }
  }

  return normalizeOrderDraft(draft);
}
