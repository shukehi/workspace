import type { Order } from '@/types/order';

export type OrderRiskLevel = 'high' | 'medium' | null;
export type OrderRiskFilter = 'ALL' | 'RISK' | 'MANUAL';

export function isOrderRiskDismissed(order: Pick<Order, 'metadata'> | null | undefined) {
  return Boolean(order?.metadata?.riskWarningDismissed);
}

export function resolveOrderRisk(
  order: Order,
  options: { ignoreDismissed?: boolean } = {},
): { level: OrderRiskLevel; reason: string } {
  if (!options.ignoreDismissed && isOrderRiskDismissed(order)) {
    return { level: null, reason: '' };
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const hasHighRisk = items.some((item: any) => {
    const supplier = String(item?.supplier || '');
    const type = String(item?.type || item?.name || '');
    const remark = String(item?.remark || '');
    return supplier.includes('待人工处理')
      || type.includes('未匹配')
      || remark.includes('待人工处理');
  });
  if (hasHighRisk) {
    return { level: 'high', reason: '存在待人工处理明细' };
  }

  const hasMediumRisk = items.some((item: any) => {
    const type = String(item?.type || item?.name || '');
    const remark = String(item?.remark || '');
    return type.includes('待确认')
      || remark.includes('待确认')
      || remark.includes('未识别');
  });
  if (hasMediumRisk) {
    return { level: 'medium', reason: '存在需人工确认明细' };
  }

  return { level: null, reason: '' };
}

export function matchesOrderRiskFilter(order: Order, filter: OrderRiskFilter) {
  const risk = resolveOrderRisk(order);
  if (filter === 'MANUAL') return risk.level === 'high';
  if (filter === 'RISK') return risk.level !== null;
  return true;
}
