import type {
    InventoryReceiptAttributes,
    InventoryReceiptCreationAttributes,
    MaterialAttributes,
    OrderWithItemsAttributes,
} from '../../models/types';

const { InventoryReceipt, Material, Order, OrderItem } = require('../../models');
const {
    createReceiptError,
} = require('./inventory-receipt.errors');
const {
    resolveMaterialLookupCandidates,
} = require('./inventory-receipt.mapper');

type LooseTransaction = unknown;
type LooseWhere = Record<string, unknown>;

interface ReceiptListQuery {
    where: LooseWhere;
    offset: number;
    pageSize: number;
}

interface ReceiptListResult {
    count: number;
    rows: InventoryReceiptAttributes[];
}

async function findMaterialForItem(
    item: { material_id?: string | number | null } | null | undefined,
    transaction?: LooseTransaction,
): Promise<MaterialAttributes> {
    const { code, numericId } = resolveMaterialLookupCandidates(item?.material_id);
    if (!code && !numericId) {
        throw createReceiptError('MATERIAL_ID_REQUIRED', { item });
    }

    let material: MaterialAttributes | null = null;
    if (code) {
        material = await Material.findOne({ where: { code }, transaction });
    }
    if (!material && numericId) {
        material = await Material.findByPk(numericId, { transaction });
    }
    if (!material) {
        throw createReceiptError('MATERIAL_NOT_FOUND', { materialId: code || String(numericId) });
    }
    return material;
}

async function listReversalReceipts(
    sourceReceiptId: number,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptAttributes[]> {
    return await InventoryReceipt.findAll({
        where: {
            source_receipt_id: sourceReceiptId,
            direction: 'reversal',
        },
        transaction,
    });
}

async function findReceiptById(
    receiptId: number,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptAttributes | null> {
    return await InventoryReceipt.findByPk(receiptId, { transaction });
}

async function findOrderWithItems(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<OrderWithItemsAttributes | null> {
    return await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction,
    });
}

async function createReceipt(
    payload: InventoryReceiptCreationAttributes,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptAttributes> {
    return await InventoryReceipt.create(payload, { transaction });
}

async function findReceiptsAndCount({
    where,
    offset,
    pageSize,
}: ReceiptListQuery): Promise<ReceiptListResult> {
    return await InventoryReceipt.findAndCountAll({
        where,
        order: [['receipt_date', 'DESC'], ['created_at', 'DESC']],
        offset,
        limit: pageSize,
    });
}

async function findRelatedReversals(originalIds: number[]): Promise<InventoryReceiptAttributes[]> {
    if (!Array.isArray(originalIds) || originalIds.length === 0) return [];
    return await InventoryReceipt.findAll({
        where: {
            direction: 'reversal',
            source_receipt_id: originalIds,
        },
    });
}

module.exports = {
    findMaterialForItem,
    listReversalReceipts,
    findReceiptById,
    findOrderWithItems,
    createReceipt,
    findReceiptsAndCount,
    findRelatedReversals,
};
