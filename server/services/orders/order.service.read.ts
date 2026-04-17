import type { PlainRecord } from '../../shared/types';
import type { OrderByIdWithItemsBinding, OrderReadListDeps, OrderSerializationBindings } from './order.service.contracts';

export function buildOrderReadBindings(bindings: OrderReadListDeps & OrderByIdWithItemsBinding) {
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
    findAllOrdersWithItems: OrderReadListDeps['findAllOrdersWithItems'];
    normalizeOrderForLog: OrderReadListDeps['normalizeOrderForLog'];
    serializeOrder: OrderReadListDeps['serializeOrder'];
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
    findOrderByIdWithItems: OrderByIdWithItemsBinding['findOrderByIdWithItems'];
    serializeOrder: OrderSerializationBindings['serializeOrder'];
  },
) {
  const order = await deps.findOrderByIdWithItems(id);
  return deps.serializeOrder(order);
}
