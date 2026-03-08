import { createHandleOrderItem } from '@/services/poContractUtils';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildHandleGroups(ctx: RuleContext): SupplierGroup[] {
  const hardware = ctx.sourceStore.hardwareRequirements;
  const handles = Array.isArray(hardware?.handles) ? hardware.handles : [];
  if (handles.length === 0) return [];

  const groupsBySupplier: Record<string, SupplierGroup> = {};

  handles.forEach((handle: any) => {
    const supplier = handle.supplier || '待人工处理';
    const key = `拉手_${supplier}`;
    if (!groupsBySupplier[key]) {
      groupsBySupplier[key] = {
        supplierName: supplier,
        category: '拉手',
        items: [],
        totalCost: 0,
      };
    }

    groupsBySupplier[key].items.push(createHandleOrderItem({
      supplier,
      type: handle.type || '拉手',
      spec: handle.spec || '-',
      qtyLeft: Number(handle.quantityLeft || 0),
      qtyRight: Number(handle.quantityRight || 0),
      quantity: Number(handle.quantity || 0),
      remark: handle.remark || '',
    }));
  });

  return Object.values(groupsBySupplier);
}
