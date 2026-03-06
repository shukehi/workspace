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

  const internalName = currentInternal
    || (internalCandidates.length === 1 ? internalCandidates[0] : (internalCandidates.length > 1 ? '多规格包装' : '未匹配'));

  let externalName = currentExternal;
  if (!externalName) {
    if (!internalName || internalName === '未匹配' || internalName === '多规格包装') {
      externalName = internalName || '未匹配';
    } else {
      externalName = String(mappings[internalName] || '').trim() || matcher.match(internalName);
    }
  }

  return {
    internalName: internalName || '未匹配',
    externalName: externalName || '未匹配',
  };
}
