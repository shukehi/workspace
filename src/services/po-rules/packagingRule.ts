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

export function buildPackagingGroups(ctx: RuleContext, options?: BuildOptions): SupplierGroup[] {
  const mergeSameSpec = options?.mergeSameSpec ?? true;
  const groups: Record<string, SupplierGroup> = {};

  if (mergeSameSpec) {
    const hardware = ctx.sourceStore.hardwareRequirements;
    const packagingMapping = ctx.configLoader.getPackagingMapping();
    const fallbackSupplier = packagingMapping?.supplierName || '方亮包装';
    const packagingRecords = hardware?.packaging ? Object.values(hardware.packaging) : [];

    packagingRecords.forEach((pkg: any) => {
      const internalName = pkg.internalName || pkg.spec || '未知包装';
      const externalName = pkg.externalName || ctx.packagingMatcher.match(internalName);
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

  const packagingMapping = ctx.configLoader.getPackagingMapping();
  const mappings = packagingMapping?.mappings || packagingMapping || {};
  const supplier = packagingMapping?.supplierName || '方亮包装';

  orderItems.forEach((item: any) => {
    const internalName = item.bz || '未知包装';
    const target = ensurePackagingGroup(groups, supplier);
    const externalName = mappings[internalName] || ctx.packagingMatcher.match(internalName);
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
