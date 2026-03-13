const { Op } = require('sequelize');
const { InventoryReceipt, Material, Order, OrderItem, sequelize } = require('../models');
const { buildOrderItemKey, buildLegacyOrderItemKey } = require('./orderItemKey');

function normalizeReceiptDate(value) {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        const error = new Error('INVALID_RECEIPT_DATE');
        error.code = 'INVALID_RECEIPT_DATE';
        throw error;
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

function normalizeReceiptQuantity(value) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        const error = new Error('INVALID_RECEIPT_QUANTITY');
        error.code = 'INVALID_RECEIPT_QUANTITY';
        throw error;
    }
    return quantity;
}

function normalizeReverseQuantity(value) {
    if (value === undefined || value === null || value === '') return null;
    return normalizeReceiptQuantity(value);
}

function resolveOrderedQuantity(rawOrderedQuantity, rawQuantity) {
    const orderedQuantity = Number(rawOrderedQuantity);
    if (Number.isFinite(orderedQuantity) && orderedQuantity > 0) {
        return orderedQuantity;
    }
    const quantity = Number(rawQuantity);
    if (Number.isFinite(quantity) && quantity > 0) {
        return quantity;
    }
    return 0;
}

function toPlainReceipt(receipt) {
    const plain = typeof receipt.get === 'function' ? receipt.get({ plain: true }) : { ...receipt };
    return {
        ...plain,
        quantity: Number(plain.quantity || 0),
        receipt_date: plain.receipt_date ? new Date(plain.receipt_date).toISOString() : null,
        created_at: plain.created_at ? new Date(plain.created_at).toISOString() : null,
        updated_at: plain.updated_at ? new Date(plain.updated_at).toISOString() : null,
    };
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
                const orderedQuantity = resolveOrderedQuantity(orderItem.ordered_quantity, orderItem.quantity);
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
        const legacyResolvedKey = buildLegacyOrderItemKey(orderItem);
        if (resolvedKey !== itemKey && legacyResolvedKey !== itemKey) {
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

class ReceiptReverseNotAllowedError extends Error {
    constructor(receiptId) {
        super('RECEIPT_REVERSE_NOT_ALLOWED');
        this.code = 'RECEIPT_REVERSE_NOT_ALLOWED';
        this.receiptId = receiptId;
    }
}

class ReceiptAlreadyReversedError extends Error {
    constructor(receiptId) {
        super('RECEIPT_ALREADY_REVERSED');
        this.code = 'RECEIPT_ALREADY_REVERSED';
        this.receiptId = receiptId;
    }
}

class ReceiptAlreadyFullyReversedError extends Error {
    constructor(receiptId) {
        super('RECEIPT_ALREADY_FULLY_REVERSED');
        this.code = 'RECEIPT_ALREADY_FULLY_REVERSED';
        this.receiptId = receiptId;
    }
}

class ReverseQuantityExceededError extends Error {
    constructor(receiptId, reversibleQuantity, requestedQuantity) {
        super('REVERSE_QUANTITY_EXCEEDED');
        this.code = 'REVERSE_QUANTITY_EXCEEDED';
        this.receiptId = receiptId;
        this.reversibleQuantity = reversibleQuantity;
        this.requestedQuantity = requestedQuantity;
    }
}

async function listReversalReceipts(sourceReceiptId, transaction) {
    return await InventoryReceipt.findAll({
        where: {
            source_receipt_id: sourceReceiptId,
            direction: 'reversal'
        },
        transaction
    });
}

function computeReversalStats(receipt, reversalReceipts) {
    const originalQuantity = Math.max(Number(receipt.quantity || 0), 0);
    const reversedQuantity = reversalReceipts.reduce(
        (sum, reversal) => sum + Math.abs(Number(reversal.quantity || 0)),
        0
    );
    return {
        originalQuantity,
        reversedQuantity,
        reversibleQuantity: Math.max(originalQuantity - reversedQuantity, 0)
    };
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
                direction: 'in',
                source_receipt_id: null,
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

    async reverseReceipt(receiptId, payload = {}) {
        const transaction = await sequelize.transaction();
        try {
            const receipt = await InventoryReceipt.findByPk(receiptId, { transaction });
            if (!receipt) {
                const error = new Error('RECEIPT_NOT_FOUND');
                error.code = 'RECEIPT_NOT_FOUND';
                throw error;
            }
            if (receipt.direction !== 'in') {
                throw new ReceiptReverseNotAllowedError(receipt.id);
            }

            const reversalReceipts = await listReversalReceipts(receipt.id, transaction);
            const { reversibleQuantity } = computeReversalStats(receipt, reversalReceipts);
            if (reversibleQuantity <= 0) {
                throw new ReceiptAlreadyFullyReversedError(receipt.id);
            }

            const order = await Order.findByPk(receipt.order_id, {
                include: [{ model: OrderItem, as: 'items' }],
                transaction
            });
            if (!order) {
                const error = new Error('ORDER_NOT_FOUND');
                error.code = 'ORDER_NOT_FOUND';
                throw error;
            }

            const orderItem = (order.items || []).find((item) => Number(item.id) === Number(receipt.order_item_id));
            if (!orderItem) {
                const error = new Error('ORDER_ITEM_NOT_FOUND');
                error.code = 'ORDER_ITEM_NOT_FOUND';
                error.orderItemId = receipt.order_item_id;
                throw error;
            }

            const material = await findMaterialForItem({ material_id: receipt.material_id }, transaction);
            const quantity = Number(receipt.quantity || 0);
            if (quantity <= 0) {
                const error = new Error('INVALID_RECEIPT_QUANTITY');
                error.code = 'INVALID_RECEIPT_QUANTITY';
                throw error;
            }

            const reversalDate = normalizeReceiptDate(payload.reversed_at || payload.receipt_date);
            const reverseReason = payload.reverse_reason ? String(payload.reverse_reason).trim() : '';
            if (!reverseReason) {
                const error = new Error('REVERSE_REASON_REQUIRED');
                error.code = 'REVERSE_REASON_REQUIRED';
                throw error;
            }
            const requestedQuantity = normalizeReverseQuantity(payload.quantity) ?? reversibleQuantity;
            if (requestedQuantity > reversibleQuantity) {
                throw new ReverseQuantityExceededError(receipt.id, reversibleQuantity, requestedQuantity);
            }

            await material.update({
                stock_quantity: Number(material.stock_quantity || 0) - requestedQuantity
            }, { transaction });

            const nextReceived = Number(orderItem.received_quantity || 0) - requestedQuantity;
            await orderItem.update({
                received_quantity: Math.max(nextReceived, 0)
            }, { transaction });

            const reversal = await InventoryReceipt.create({
                order_id: receipt.order_id,
                order_no: receipt.order_no,
                order_item_id: receipt.order_item_id,
                direction: 'reversal',
                source_receipt_id: receipt.id,
                reverse_reason: reverseReason,
                material_id: receipt.material_id,
                item_name: receipt.item_name,
                supplier: receipt.supplier || order.supplier || '',
                quantity: -requestedQuantity,
                unit: receipt.unit || material.unit || '',
                receipt_date: reversalDate,
                operator: payload.operator ? String(payload.operator).trim() : null,
                remark: payload.remark ? String(payload.remark) : ''
            }, { transaction });

            const refreshedItems = order.items || [];
            const allReceived = refreshedItems.every((item) => {
                const ordered = resolveOrderedQuantity(item.ordered_quantity, item.quantity);
                const received = Number(item.id === orderItem.id ? Math.max(nextReceived, 0) : item.received_quantity || 0);
                return ordered > 0 && received >= ordered;
            });

            await order.update({
                status: allReceived ? 'completed' : 'arrived',
                stocked_in_at: allReceived ? order.stocked_in_at : null,
                stocked_in_by: allReceived ? order.stocked_in_by : null,
                stocked_in_remark: allReceived ? order.stocked_in_remark : ''
            }, { transaction });

            await transaction.commit();
            return toPlainReceipt(reversal);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async list(query = {}) {
        const where = {};
        if (query.orderId) where.order_id = Number(query.orderId);
        if (query.orderNo) where.order_no = String(query.orderNo).trim();
        if (query.direction && ['in', 'reversal'].includes(String(query.direction))) {
            where.direction = String(query.direction);
        }
        if (query.reverseReason) {
            where.reverse_reason = String(query.reverseReason).trim();
        }
        const keyword = String(query.keyword || '').trim();
        if (keyword) {
            where[Op.or] = [
                { order_no: { [Op.like]: `%${keyword}%` } },
                { supplier: { [Op.like]: `%${keyword}%` } },
                { item_name: { [Op.like]: `%${keyword}%` } },
                { operator: { [Op.like]: `%${keyword}%` } },
                { material_id: { [Op.like]: `%${keyword}%` } }
            ];
        }
        const page = Math.max(1, Number(query.page) || 1);
        const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 50));
        const offset = (page - 1) * pageSize;

        const result = await InventoryReceipt.findAndCountAll({
            where,
            order: [['receipt_date', 'DESC'], ['created_at', 'DESC']],
            offset,
            limit: pageSize
        });

        const plainReceipts = result.rows.map(toPlainReceipt);
        const originalIds = plainReceipts
            .filter((receipt) => receipt.direction !== 'reversal')
            .map((receipt) => Number(receipt.id))
            .filter((id) => Number.isInteger(id) && id > 0);
        const reversalGroups = new Map();

        if (originalIds.length > 0) {
            const relatedReversals = await InventoryReceipt.findAll({
                where: {
                    direction: 'reversal',
                    source_receipt_id: { [Op.in]: originalIds }
                }
            });

            for (const reversal of relatedReversals.map(toPlainReceipt)) {
                const key = Number(reversal.source_receipt_id);
                const current = reversalGroups.get(key) || [];
                current.push(reversal);
                reversalGroups.set(key, current);
            }
        }

        const rows = plainReceipts.map((receipt) => {
            if (receipt.direction === 'reversal') {
                return {
                    ...receipt,
                    reversed_quantity: null,
                    reversible_quantity: null
                };
            }
            const reversals = reversalGroups.get(Number(receipt.id)) || [];
            const { reversedQuantity, reversibleQuantity } = computeReversalStats(receipt, reversals);
            return {
                ...receipt,
                reversed_quantity: reversedQuantity,
                reversible_quantity: reversibleQuantity
            };
        });

        return {
            rows,
            total: Number(result.count || 0),
            page,
            pageSize
        };
    }
}

const service = new InventoryReceiptService();
service.ReceiptReverseNotAllowedError = ReceiptReverseNotAllowedError;
service.ReceiptAlreadyReversedError = ReceiptAlreadyReversedError;
service.ReceiptAlreadyFullyReversedError = ReceiptAlreadyFullyReversedError;
service.ReverseQuantityExceededError = ReverseQuantityExceededError;

module.exports = service;
