import { createRawMaterialOrderItem } from '@/services/poContractUtils';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildRawMaterialGroups(ctx: RuleContext): SupplierGroup[] {
  const groups: SupplierGroup[] = [];
  const materials = ctx.sourceStore.materialRequirements;
  if (!materials || !materials.requirements) return groups;

  Object.values(materials.requirements).forEach((group: any) => {
    const supplier = group.supplierName || '未知供应商';
    const items = Array.isArray(group.materials) ? group.materials : [];
    if (items.length === 0) return;

    groups.push({
      supplierName: supplier,
      category: '原辅材料',
      totalCost: 0,
      items: items.map((mat: any) => createRawMaterialOrderItem({
        supplier,
        materialId: mat.materialId,
        totalUsage: Number(mat.totalUsage || 0)
      }))
    });
  });

  return groups;
}
