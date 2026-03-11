import { createLockOrderItem } from '@/services/poContractUtils';
import type { RuleContext, SupplierGroup } from '@/services/po-rules/types';

export function buildLockGroups(ctx: RuleContext): SupplierGroup[] {
  const hardware = ctx.sourceStore.hardwareRequirements;
  const locks = Array.isArray(hardware?.locks) ? hardware.locks : [];
  if (locks.length === 0) return [];

  const groupsBySupplier: Record<string, SupplierGroup> = {};

  locks.forEach((lock: any) => {
    const supplier = lock.supplier || '待人工处理';
    const key = `锁具_${supplier}`;
    if (!groupsBySupplier[key]) {
      groupsBySupplier[key] = {
        supplierName: supplier,
        category: '锁具',
        items: [],
        totalCost: 0,
      };
    }

    groupsBySupplier[key].items.push(createLockOrderItem({
      supplier,
      type: lock.type || '锁具',
      spec: lock.spec || '-',
      unit: lock.unit || '套',
      qtyLeft: Number(lock.quantityLeft || 0),
      qtyRight: Number(lock.quantityRight || 0),
      quantity: Number(lock.quantity || 0),
      remark: lock.remark || '',
    }));
  });

  return Object.values(groupsBySupplier);
}
