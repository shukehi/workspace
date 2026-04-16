export type InventoryQuery = {
  warehouseId?: number | string;
  locationId?: number | string;
  keyword?: string;
  lowStockOnly?: boolean;
};

export type ReceiptQuery = {
  orderNo?: string;
  orderId?: number | string;
  warehouseId?: number | string;
  locationId?: number | string;
  keyword?: string;
  direction?: 'in' | 'reversal';
  reverseReason?: string;
  page?: number;
  pageSize?: number;
};

export type OutboundQuery = {
  outboundNo?: string;
  keyword?: string;
  operator?: string;
  warehouseId?: number | string;
  locationId?: number | string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type MovementQuery = {
  materialId?: number | string;
  warehouseId?: number | string;
  locationId?: number | string;
  sourceType?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export function appendIfPresent(query: URLSearchParams, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return;
  query.set(key, String(value).trim());
}

export function buildInventoryQuery(params: InventoryQuery = {}) {
  const query = new URLSearchParams();
  appendIfPresent(query, 'warehouseId', params.warehouseId);
  appendIfPresent(query, 'locationId', params.locationId);
  appendIfPresent(query, 'keyword', params.keyword);
  if (params.lowStockOnly) {
    query.set('lowStockOnly', 'true');
  }
  return query.toString() ? `?${query.toString()}` : '';
}

export function buildReceiptQuery(params: ReceiptQuery = {}) {
  const query = new URLSearchParams();
  appendIfPresent(query, 'orderNo', params.orderNo);
  appendIfPresent(query, 'orderId', params.orderId);
  appendIfPresent(query, 'warehouseId', params.warehouseId);
  appendIfPresent(query, 'locationId', params.locationId);
  appendIfPresent(query, 'keyword', params.keyword);
  appendIfPresent(query, 'direction', params.direction);
  appendIfPresent(query, 'reverseReason', params.reverseReason);
  appendIfPresent(query, 'page', params.page);
  appendIfPresent(query, 'pageSize', params.pageSize);
  return query.toString() ? `?${query.toString()}` : '';
}

export function buildOutboundQuery(params: OutboundQuery = {}) {
  const query = new URLSearchParams();
  appendIfPresent(query, 'outboundNo', params.outboundNo);
  appendIfPresent(query, 'keyword', params.keyword);
  appendIfPresent(query, 'operator', params.operator);
  appendIfPresent(query, 'warehouseId', params.warehouseId);
  appendIfPresent(query, 'locationId', params.locationId);
  appendIfPresent(query, 'startDate', params.startDate);
  appendIfPresent(query, 'endDate', params.endDate);
  appendIfPresent(query, 'page', params.page);
  appendIfPresent(query, 'pageSize', params.pageSize);
  return query.toString() ? `?${query.toString()}` : '';
}

export function buildMovementQuery(params: MovementQuery = {}) {
  const query = new URLSearchParams();
  appendIfPresent(query, 'materialId', params.materialId);
  appendIfPresent(query, 'warehouseId', params.warehouseId);
  appendIfPresent(query, 'locationId', params.locationId);
  appendIfPresent(query, 'sourceType', params.sourceType);
  appendIfPresent(query, 'keyword', params.keyword);
  appendIfPresent(query, 'startDate', params.startDate);
  appendIfPresent(query, 'endDate', params.endDate);
  appendIfPresent(query, 'page', params.page);
  appendIfPresent(query, 'pageSize', params.pageSize);
  return query.toString() ? `?${query.toString()}` : '';
}
