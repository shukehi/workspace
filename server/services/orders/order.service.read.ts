import type { PlainRecord } from '../../shared/types';

export type OrderReadBindings = {
  findAllOrdersWithItems: (where: PlainRecord) => Promise<PlainRecord[]>;
  findOrderByIdWithItems: (id: number | string) => Promise<PlainRecord | null>;
  normalizeOrderForLog: (order: PlainRecord) => PlainRecord;
  serializeOrder: (order: PlainRecord | null) => PlainRecord | null;
};

export function buildOrderReadBindings(bindings: OrderReadBindings) {
  return {
    findAllOrdersWithItems: bindings.findAllOrdersWithItems,
    findOrderByIdWithItems: bindings.findOrderByIdWithItems,
    normalizeOrderForLog: bindings.normalizeOrderForLog,
    serializeOrder: bindings.serializeOrder,
  };
}

export async function getAllOrdersResult(
  category: string | undefined,
  deps: {
    findAllOrdersWithItems: (where: PlainRecord) => Promise<PlainRecord[]>;
    normalizeOrderForLog: (order: PlainRecord) => PlainRecord;
    serializeOrder: (order: PlainRecord | null) => PlainRecord | null;
  },
) {
  const where: PlainRecord = {};
  if (typeof category === 'string' && category.trim()) {
    where.category = category.trim();
  }

  const orders = await deps.findAllOrdersWithItems(where);
  const invalidOrders = orders
    .map((order) => ({ order }))
    .filter(({ order }) => !order || !order.created_at)
    .map(({ order }) => deps.normalizeOrderForLog(order));

  if (invalidOrders.length > 0) {
    console.warn('[OrderService] getAllOrders found records with missing created_at:', invalidOrders);
  }

  return orders.map((order) => deps.serializeOrder(order) as PlainRecord);
}


export async function getOrderByIdResult(
  id: number | string,
  deps: {
    findOrderByIdWithItems: (id: number | string) => Promise<PlainRecord | null>;
    serializeOrder: (order: PlainRecord | null) => PlainRecord | null;
  },
) {
  const order = await deps.findOrderByIdWithItems(id);
  return deps.serializeOrder(order);
}
