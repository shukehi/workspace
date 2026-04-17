import { createPaginationResponse } from '../../shared/contracts/pagination';
import type { OrderListQuery } from '../../models/types';
import type { PlainRecord } from '../../shared/types';
import type { OrderQueryBindings, OrderQuerySurfaceBindings } from './order.service.contracts';
import * as orderRepository from './order.repository';

export function buildOrderQueryBindings(bindings: OrderQueryBindings) {
  return {
    serializeOrder: bindings.serializeOrder,
    buildOrderSummary: bindings.buildOrderSummary,
    buildOrderFacets: bindings.buildOrderFacets,
  };
}

export async function getPaginatedOrdersResult(
  query: OrderListQuery,
  deps: {
    serializeOrder: OrderQuerySurfaceBindings['serializeOrder'];
    buildOrderSummary: OrderQuerySurfaceBindings['buildOrderSummary'];
    buildOrderFacets: OrderQuerySurfaceBindings['buildOrderFacets'];
  },
) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(200, Math.max(10, Number(query.pageSize) || 50));
  const aggregates = await orderRepository.getPaginatedOrderAggregates(query);
  if (aggregates.total === 0) {
    return createPaginationResponse({
      rows: [],
      total: 0,
      page,
      pageSize,
      summary: deps.buildOrderSummary([]),
      facets: deps.buildOrderFacets([]),
    });
  }

  const pagedIds = await orderRepository.findPaginatedOrderIds(query, page, pageSize);
  const orders = await orderRepository.findOrdersWithItemsByIds(pagedIds);
  const serializedOrders = orders.map((order) => deps.serializeOrder(order) as PlainRecord);
  const rowsById = new Map<number, PlainRecord>();
  serializedOrders.forEach((order) => {
    if (order && Number.isInteger(order.id)) {
      rowsById.set(Number(order.id), order);
    }
  });
  const rows = pagedIds
    .map((id) => rowsById.get(id))
    .filter((order): order is PlainRecord => Boolean(order));

  return createPaginationResponse({
    rows,
    total: aggregates.total,
    page,
    pageSize,
    summary: aggregates.summary,
    facets: aggregates.facets,
  });
}
