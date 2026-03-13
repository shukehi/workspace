const { InventoryReceipt, Material } = require('../models');
const { buildOrderItemKey } = require('./orderItemKey');

function normalizeReceiptDate(value) {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        throw new Error('INVALID_RECEIPT_DATE');
    }
    return parsed.toISOString();
}

function resolveMaterialLookupCandidates(rawMaterialId) {
    const normalized = String(rawMaterialId || '').trim();
    if (!normalized) return { code: '', numericId: null };
    const numericId = Number(normalized);
    return {
        code: normalized,
        numericId: Number.isInteger(numericId) && numericId > 0 ? numericId : null
    };
}

async function findMaterialForItem(item, transaction) {
    const { code, numericId } = resolveMaterialLookupCandidates(item?.material_id);
    if (!code && !numericId) {
        const error = new Error('MATERIAL_ID_REQUIRED');
        error.code = 'MATERIAL_ID_REQUIRED';
        error.item = item;
        throw error;
    }

    let material = null;
    if (code) {
        material = await Material.findOne({ where: { code }, transaction });
    }
    if (!material && numericId) {
        material = await Material.findByPk(numericId, { transaction });
    }
    if (!material) {
        const error = new Error('MATERIAL_NOT_FOUND');
        error.code = 'MATERIAL_NOT_FOUND';
        error.materialId = code || String(numericId);
        throw error;
    }
    return material;
}

function normalizeReceiptQuantity(value, fallback = 0) {
    const quantity = value === undefined ? fallback : Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        const error = new Error('INVALID_RECEIPT_QUANTITY');
        error.code = 'INVALID_RECEIPT_QUANTITY';
        throw error;
    }
    return quantity;
}

function resolveReceiptOrderItems(order, payload = {}) {
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    if (orderItems.length === 0) {
        const error = new Error('ORDER_ITEMS_REQUIRED');
        error.code = 'ORDER_ITEMS_REQUIRED';
        throw error;
    }

    if (payload.items === undefined) {
        return orderItems
            .map((orderItem) => {
                const orderedQuantity = Number(orderItem.ordered_quantity ?? orderItem.quantity ?? 0);
                const receivedQuantity = Number(orderItem.received_quantity || 0);
                const remainingQuantity = orderedQuantity - receivedQuantity;
                if (remainingQuantity <= 0) return null;
                return {
                    orderItem,
                    quantity: remainingQuantity,
                    itemKey: buildOrderItemKey(orderItem)
                };
            })
            .filter(Boolean);
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
        const error = new Error('ORDER_ITEMS_REQUIRED');
        error.code = 'ORDER_ITEMS_REQUIRED';
        throw error;
    }

    const seenOrderItemIds = new Set();
    return payload.items.map((rawItem) => {
        const orderItemId = Number(rawItem?.order_item_id);
        const itemKey = String(rawItem?.item_key || '').trim();

        if (!Number.isInteger(orderItemId) || orderItemId <= 0) {
            const error = new Error('ORDER_ITEM_ID_REQUIRED');
            error.code = 'ORDER_ITEM_ID_REQUIRED';
            throw error;
        }

        if (!itemKey) {
            const error = new Error('RECEIPT_ITEM_KEY_REQUIRED');
            error.code = 'RECEIPT_ITEM_KEY_REQUIRED';
            error.orderItemId = orderItemId;
            throw error;
        }

        if (seenOrderItemIds.has(orderItemId)) {
            const error = new Error('DUPLICATE_RECEIPT_ITEM');
            error.code = 'DUPLICATE_RECEIPT_ITEM';
            error.orderItemId = orderItemId;
            throw error;
        }
        seenOrderItemIds.add(orderItemId);

        const orderItem = orderItems.find((candidate) => Number(candidate.id) === orderItemId);
        if (!orderItem) {
            const error = new Error('ORDER_ITEM_NOT_FOUND');
            error.code = 'ORDER_ITEM_NOT_FOUND';
            error.orderItemId = orderItemId;
            throw error;
        }

        const resolvedKey = buildOrderItemKey(orderItem);
        if (resolvedKey !== itemKey) {
            const error = new Error('ORDER_ITEM_KEY_MISMATCH');
            error.code = 'ORDER_ITEM_KEY_MISMATCH';
            error.orderItemId = orderItemId;
            error.expectedItemKey = resolvedKey;
            throw error;
        }

        return {
            orderItem,
            quantity: normalizeReceiptQuantity(rawItem?.quantity),
            itemKey: resolvedKey
        };
    });
}

class InventoryReceiptService {
    async createFromOrder(order, payload = {}, transaction) {
        const receiptDate = normalizeReceiptDate(payload.stocked_in_at || payload.receipt_date);
        const operator = payload.operator ? String(payload.operator).trim() : '';
        const remark = payload.remark ? String(payload.remark) : '';
        const receiptItems = resolveReceiptOrderItems(order, payload);
        if (receiptItems.length === 0) {
            const error = new Error('ORDER_ITEMS_REQUIRED');
            error.code = 'ORDER_ITEMS_REQUIRED';
            throw error;
        }

        const created = [];
        for (const receiptItem of receiptItems) {
            const item = receiptItem.orderItem;
            const material = await findMaterialForItem(item, transaction);
            const quantity = receiptItem.quantity;

            await material.update({
                stock_quantity: Number(material.stock_quantity || 0) + quantity
            }, { transaction });

            const receipt = await InventoryReceipt.create({
                order_id: order.id,
                order_no: order.order_no,
                order_item_id: item.id || null,
                material_id: String(item.material_id || material.code || material.id),
                item_name: item.name || item.type || item.model || '-',
                supplier: item.supplier || order.supplier || '',
                quantity,
                unit: item.unit || material.unit || '',
                receipt_date: receiptDate,
                operator: operator || null,
                remark,
            }, { transaction });

            created.push(receipt);
        }

        return {
            receipts: created,
            receiptItems
        };
    }

    async list(query = {}) {
        const where = {};
        if (query.orderId) where.order_id = Number(query.orderId);
        if (query.orderNo) where.order_no = String(query.orderNo).trim();

        const receipts = await InventoryReceipt.findAll({
            where,
            order: [['receipt_date', 'DESC'], ['created_at', 'DESC']]
        });

        return receipts.map((receipt) => {
            const plain = typeof receipt.get === 'function' ? receipt.get({ plain: true }) : { ...receipt };
            return {
                ...plain,
                quantity: Number(plain.quantity || 0),
                receipt_date: plain.receipt_date ? new Date(plain.receipt_date).toISOString() : null,
                created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
                updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
            };
        });
    }
}

module.exports = new InventoryReceiptService();
