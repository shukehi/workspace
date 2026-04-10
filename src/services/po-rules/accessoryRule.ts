import { createHardwareOrderItem } from '@/services/poContractUtils';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildAccessoryGroups(ctx: RuleContext): SupplierGroup[] {
  const hardware = ctx.sourceStore.hardwareRequirements;
  const accessories = Array.isArray(hardware?.accessories) ? hardware.accessories : [];
  if (accessories.length === 0) return [];

  const groupsBySupplier: Record<string, SupplierGroup> = {};

  accessories.forEach((accessory: any) => {
    const materialId = String(accessory.materialId || '').trim();
    if (!materialId) return;

    const supplier = accessory.supplier || '待人工处理';
    const key = `五金配件_${supplier}`;
    if (!groupsBySupplier[key]) {
      groupsBySupplier[key] = {
        supplierName: supplier,
        category: '五金/配件',
        items: [],
        totalCost: 0,
      };
    }

    groupsBySupplier[key].items.push(createHardwareOrderItem({
      materialId,
      supplier,
      type: accessory.type || '五金配件',
      spec: accessory.spec || '-',
      quantity: Number(accessory.quantity || 0),
      unit: accessory.unit || '个',
      remark: accessory.remark || '',
    }));
  });

  return Object.values(groupsBySupplier);
}
