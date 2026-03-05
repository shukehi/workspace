import { createCylinderOrderItem } from '@/services/poContractUtils';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildCylinderGroups(ctx: RuleContext): SupplierGroup[] {
  const hardware = ctx.sourceStore.hardwareRequirements;
  const cylinders = Array.isArray(hardware?.cylinders) ? hardware.cylinders : [];
  if (cylinders.length === 0) return [];

  const groupsBySupplier: Record<string, SupplierGroup> = {};

  cylinders.forEach((cyl: any) => {
    const supplier = cyl.supplier || '未分配五金';
    const key = `锁芯_${supplier}`;
    if (!groupsBySupplier[key]) {
      groupsBySupplier[key] = {
        supplierName: supplier,
        category: '锁芯',
        items: [],
        totalCost: 0
      };
    }

    groupsBySupplier[key].items.push(createCylinderOrderItem({
      supplier,
      type: cyl.type || '锁芯',
      eccentricity: cyl.eccentricity,
      quantity: Number(cyl.quantity || 0),
      remark: cyl.remark
    }));
  });

  return Object.values(groupsBySupplier);
}
