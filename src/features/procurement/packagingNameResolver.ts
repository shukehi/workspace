import type { Order, OrderItem } from '@/types/order';

type PackagingMappingLike = {
  mappings?: Record<string, string>;
  supplierName?: string;
} & Record<string, any>;

function resolveMappings(mapping: PackagingMappingLike | null | undefined) {
  if (!mapping || typeof mapping !== 'object') return {} as Record<string, string>;
  return (mapping.mappings || mapping) as Record<string, string>;
}

function pickFirstMeaningful(values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function normalizeInternalName(item: Partial<OrderItem>) {
  return pickFirstMeaningful([
    item.internal_name,
    (item as any).internalName,
    (item as any).bz,
  ]);
}

export function resolvePackagingHeaderNames(
  order: Partial<Order>,
  mapping: PackagingMappingLike | null | undefined,
  matcher: { match: (internalName: string) => string }
) {
  const mappings = resolveMappings(mapping);
  const items = Array.isArray(order.items) ? order.items : [];
  const internalCandidates = Array.from(new Set(
    items
      .map((item) => normalizeInternalName(item))
      .filter(Boolean)
  ));

  const currentInternal = String(order.metadata?.internal_name || '').trim();
  const currentExternal = String(order.metadata?.external_name || '').trim();
  const hasItemCandidates = internalCandidates.length > 0;

  const internalName = hasItemCandidates
    ? (internalCandidates.length === 1 ? internalCandidates[0] : '多规格包装')
    : (currentInternal || '未匹配');

  const externalName = (() => {
    if (!internalName || internalName === '未匹配' || internalName === '多规格包装') {
      return internalName || '未匹配';
    }
    const mapped = String(mappings[internalName] || '').trim();
    if (mapped) return mapped;
    if (!hasItemCandidates && currentExternal) return currentExternal;
    return matcher.match(internalName);
  })();

  return {
    internalName: internalName || '未匹配',
    externalName: externalName || '未匹配',
  };
}
