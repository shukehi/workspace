import type {
  Order,
  ProcurementOrderFacetCounts,
  ProcurementOrderSummary,
} from '@/types/order';
import { ORDER_PENDING_STATUSES } from '@/shared/constants/order';

export const PROCUREMENT_PENDING_ORDER_STATUSES: ReadonlyArray<Order['status']> = ORDER_PENDING_STATUSES;

export function buildSummaryFromOrders(
  orders: Order[],
  today = new Date().toISOString().split('T')[0],
): ProcurementOrderSummary {
  const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const pendingCount = orders.filter((order) => (
    PROCUREMENT_PENDING_ORDER_STATUSES.includes(order.status)
  )).length;
  const completedCount = orders.filter((order) => order.status === 'completed').length;
  const todayCount = orders.filter((order) => (
    String(order.created_at || '').startsWith(today)
  )).length;

  return { totalAmount, pendingCount, completedCount, todayCount };
}

export function buildFacetCountsFromOrders(orders: Order[]): ProcurementOrderFacetCounts {
  const statusCounts: Record<string, number> = { ALL: orders.length };
  const categoryCounts: Record<string, number> = { ALL: orders.length };
  const riskCounts: Record<string, number> = { ALL: orders.length, RISK: 0, MANUAL: 0 };

  orders.forEach((order) => {
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    const categoryKey = String(order.category || '');
    categoryCounts[categoryKey] = (categoryCounts[categoryKey] || 0) + 1;
  });

  return { statusCounts, categoryCounts, riskCounts };
}
