import { parseQuantity, parseQuantityPair } from '@/lib/erp-engine/parsers';
import { createPackagingOrderItem } from '@/services/poContractUtils';
import type { BuildOptions, RuleContext, SupplierGroup } from '@/services/po-rules/types';

function ensurePackagingGroup(groups: Record<string, SupplierGroup>, supplier: string) {
  const key = `包装_${supplier}`;
  if (!groups[key]) {
    groups[key] = {
      supplierName: supplier,
      category: '包装',
      items: [],
      totalCost: 0
    };
  }
  return groups[key];
}

function resolvePackagingNames(
  rawInternalName: unknown,
  mappings: Record<string, string>,
  match: (internalName: string) => string,
  fallbackExternalName?: unknown
) {
  const normalized = String(rawInternalName || '').trim();
  if (!normalized) {
    return {
      internalName: '未匹配',
      externalName: '未匹配',
    };
  }

  return {
    internalName: normalized,
    externalName: mappings[normalized] || String(fallbackExternalName || '').trim() || match(normalized),
  };
}

export function buildPackagingGroups(ctx: RuleContext, options?: BuildOptions): SupplierGroup[] {
  const mergeSameSpec = options?.mergeSameSpec ?? true;
  const groups: Record<string, SupplierGroup> = {};
  const packagingMapping = ctx.configLoader.getPackagingMapping();
  const mappings = (packagingMapping?.mappings || packagingMapping || {}) as Record<string, string>;
  const fallbackSupplier = packagingMapping?.supplierName || '方亮包装';

  if (mergeSameSpec) {
    const hardware = ctx.sourceStore.hardwareRequirements;
    const packagingRecords = hardware?.packaging ? Object.values(hardware.packaging) : [];

    packagingRecords.forEach((pkg: any) => {
      const { internalName, externalName } = resolvePackagingNames(
        pkg.internalName,
        mappings,
        ctx.packagingMatcher.match.bind(ctx.packagingMatcher),
        pkg.externalName
      );
      const supplier = pkg.supplierName || fallbackSupplier;
      const target = ensurePackagingGroup(groups, supplier);

      target.items.push(createPackagingOrderItem({
        internalName,
        externalName,
        productName: pkg.productModelName,
        spec: pkg.spec || '-',
        mb: pkg.mb || '-',
        qty: Number(pkg.totalQty || 0),
        qtyLeft: Number(pkg.totalLeft || 0),
        qtyRight: Number(pkg.totalRight || 0),
        supplier
      }));
    });

    return Object.values(groups);
  }

  const orderItems = Array.isArray(ctx.sourceStore.currentOrder?.list)
    ? ctx.sourceStore.currentOrder.list
    : [];

  const supplier = fallbackSupplier;

  orderItems.forEach((item: any) => {
    const { internalName, externalName } = resolvePackagingNames(
      item.bz,
      mappings,
      ctx.packagingMatcher.match.bind(ctx.packagingMatcher)
    );
    const target = ensurePackagingGroup(groups, supplier);
    const qtyPair = parseQuantityPair(item.qty);

    target.items.push(createPackagingOrderItem({
      internalName,
      externalName,
      productName: item.productModelName,
      spec: item.spec || '-',
      mb: item.mb || '-',
      qty: parseQuantity(item.qty),
      qtyLeft: qtyPair.left,
      qtyRight: qtyPair.right,
      supplier
    }));
  });

  return Object.values(groups);
}
