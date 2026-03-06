import { packagingMatcher } from '@/lib/packagingMatcher';
import { configLoader } from '@/services/configLoader';
import type { Order } from '@/types/order';
import { normalizeOrderDraft, cloneOrderDraft } from '@/features/procurement/orderDraft';
import { resolvePackagingHeaderNames } from '@/features/procurement/packagingNameResolver';

export function prepareOrderDraft(order: Order): Order {
  const draft = cloneOrderDraft(order);
  if (!draft.metadata) draft.metadata = {};

  const isPackagingOrder = draft.category && String(draft.category).includes('包装');
  if (isPackagingOrder) {
    const names = resolvePackagingHeaderNames(
      draft,
      configLoader.getPackagingMapping(),
      packagingMatcher
    );
    draft.metadata.internal_name = names.internalName;
    draft.metadata.external_name = names.externalName;

    if (!draft.supplier) {
      const packagingConfig = configLoader.getPackagingMapping();
      draft.supplier = packagingConfig?.supplierName || '默认供应商';
    }
  }

  return normalizeOrderDraft(draft);
}
