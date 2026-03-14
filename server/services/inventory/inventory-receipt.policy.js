const { buildOrderItemKey, buildLegacyOrderItemKey } = require('../orderItemKey');
const {
  createReceiptError,
} = require('./inventory-receipt.errors');
const {
  normalizeReceiptQuantity,
  resolveOrderedQuantity,
} = require('./inventory-receipt.mapper');

function resolveReceiptOrderItems(order, payload = {}) {
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  if (orderItems.length === 0) {
    throw createReceiptError('ORDER_ITEMS_REQUIRED');
  }

  if (payload.items === undefined) {
    return orderItems
      .map((orderItem) => {
        const orderedQuantity = resolveOrderedQuantity(orderItem.ordered_quantity, orderItem.quantity);
        const receivedQuantity = Number(orderItem.received_quantity || 0);
        const remainingQuantity = orderedQuantity - receivedQuantity;
        if (remainingQuantity <= 0) return null;
        return {
          orderItem,
          quantity: remainingQuantity,
          itemKey: buildOrderItemKey(orderItem),
        };
      })
      .filter(Boolean);
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw createReceiptError('ORDER_ITEMS_REQUIRED');
  }

  const seenOrderItemIds = new Set();
  return payload.items.map((rawItem) => {
    const orderItemId = Number(rawItem?.order_item_id);
    const itemKey = String(rawItem?.item_key || '').trim();

    if (!Number.isInteger(orderItemId) || orderItemId <= 0) {
      throw createReceiptError('ORDER_ITEM_ID_REQUIRED');
    }

    if (!itemKey) {
      throw createReceiptError('RECEIPT_ITEM_KEY_REQUIRED', { orderItemId });
    }

    if (seenOrderItemIds.has(orderItemId)) {
      throw createReceiptError('DUPLICATE_RECEIPT_ITEM', { orderItemId });
    }
    seenOrderItemIds.add(orderItemId);

    const orderItem = orderItems.find((candidate) => Number(candidate.id) === orderItemId);
    if (!orderItem) {
      throw createReceiptError('ORDER_ITEM_NOT_FOUND', { orderItemId });
    }

    const resolvedKey = buildOrderItemKey(orderItem);
    const legacyResolvedKey = buildLegacyOrderItemKey(orderItem);
    if (resolvedKey !== itemKey && legacyResolvedKey !== itemKey) {
      throw createReceiptError('ORDER_ITEM_KEY_MISMATCH', {
        orderItemId,
        expectedItemKey: resolvedKey,
      });
    }

    return {
      orderItem,
      quantity: normalizeReceiptQuantity(rawItem?.quantity),
      itemKey: resolvedKey,
    };
  });
}

module.exports = {
  resolveReceiptOrderItems,
};
