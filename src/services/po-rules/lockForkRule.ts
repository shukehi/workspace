import { createLockForkOrderItem } from '@/services/poContractUtils';
import { sortProcurementItems } from '@/features/procurement/itemSort';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildLockForkGroups(ctx: RuleContext): SupplierGroup[] {
  const hardware = ctx.sourceStore.hardwareRequirements;
  const lockForks = Array.isArray(hardware?.lockForks) ? hardware.lockForks : [];
  if (lockForks.length === 0) return [];

  const groupsBySupplier: Record<string, SupplierGroup> = {};

  lockForks.forEach((fork: any) => {
    const supplier = fork.supplier || '未分配五金';
    const key = `锁叉_${supplier}`;
    if (!groupsBySupplier[key]) {
      groupsBySupplier[key] = {
        supplierName: supplier,
        category: '锁叉',
        items: [],
        totalCost: 0
      };
    }

    groupsBySupplier[key].items.push(createLockForkOrderItem({
      supplier,
      type: fork.type || '锁叉',
      spec: fork.spec || '-',
      quantity: Number(fork.quantity || 0),
      remark: fork.remark || ''
    }));
  });

  return Object.values(groupsBySupplier).map((group) => ({
    ...group,
    items: sortProcurementItems(group.category, group.items)
  }));
}
