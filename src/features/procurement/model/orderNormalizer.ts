import type {
  Order,
  ProcurementOrderListResponse,
} from '@/types/order';

export function normalizeDateField(value: any): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value.toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function isValidOrder(order: any): order is Order {
  return !!order
    && typeof order === 'object'
    && typeof order.order_no === 'string'
    && (typeof order.created_at === 'string' || order.id != null);
}

export function normalizeOrderPayload(payload: any): Order | null {
  let candidate = payload;

  if (candidate && typeof candidate === 'object') {
    if (candidate.data) candidate = candidate.data;
    else if (candidate.order) candidate = candidate.order;
    else if (Array.isArray(candidate.rows) && candidate.rows.length > 0) candidate = candidate.rows[0];
  }

  if (candidate && typeof candidate === 'object') {
    const createdAt = normalizeDateField(
      candidate.created_at ?? candidate.createdAt ?? candidate.updated_at ?? candidate.updatedAt,
    );

    if (!createdAt) {
      console.warn('[orderNormalizer] order missing created_at, using fallback:', {
        id: candidate.id,
        order_no: candidate.order_no,
      });
    }

    candidate = {
      ...candidate,
      created_at: createdAt ?? new Date(0).toISOString(),
      total_amount: Number.isFinite(Number(candidate.total_amount)) ? Number(candidate.total_amount) : 0,
      items: Array.isArray(candidate.items) ? candidate.items : [],
    };
  }

  return isValidOrder(candidate) ? candidate : null;
}

export function normalizeOrderListPayload(payload: any): ProcurementOrderListResponse | null {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.rows)) return null;

  const rows = payload.rows.filter(isValidOrder);
  return {
    rows,
    total: Math.max(0, Number(payload.total) || 0),
    page: Math.max(1, Number(payload.page) || 1),
    pageSize: Math.max(1, Number(payload.pageSize) || 20),
    summary: {
      totalAmount: Number(payload.summary?.totalAmount || 0),
      pendingCount: Number(payload.summary?.pendingCount || 0),
      completedCount: Number(payload.summary?.completedCount || 0),
      todayCount: Number(payload.summary?.todayCount || 0),
    },
    facets: {
      statusCounts: payload.facets?.statusCounts && typeof payload.facets.statusCounts === 'object'
        ? payload.facets.statusCounts
        : { ALL: rows.length },
      categoryCounts: payload.facets?.categoryCounts && typeof payload.facets.categoryCounts === 'object'
        ? payload.facets.categoryCounts
        : { ALL: rows.length },
      riskCounts: payload.facets?.riskCounts && typeof payload.facets.riskCounts === 'object'
        ? payload.facets.riskCounts
        : { ALL: rows.length, RISK: 0, MANUAL: 0 },
    },
  };
}

export function isNotFoundError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  return status === 404;
}

export function logInvalidOrders(source: string, orders: any[]) {
  if (!Array.isArray(orders)) return;
  const invalid = orders
    .map((order, index) => ({ order, index }))
    .filter(({ order }) => !isValidOrder(order))
    .map(({ order, index }) => ({
      index,
      type: order === null ? 'null' : typeof order,
      id: order?.id,
      order_no: order?.order_no,
      created_at: order?.created_at,
    }));

  if (invalid.length > 0) {
    console.warn(`[ProcurementStore] invalid orders from ${source}:`, invalid);
  }
}
