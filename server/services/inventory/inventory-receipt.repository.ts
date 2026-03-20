import type {
    InventoryReceiptAttributes,
    InventoryReceiptCreationAttributes,
} from '../../models/types';
import type {
    InventoryReceiptInstance,
    MaterialInstance,
    OrderInstance,
} from '../../models';

import type { Transaction } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { InventoryReceipt, Material, Order, OrderItem } from '../../models';
import { createReceiptError } from './inventory-receipt.errors';
import { resolveMaterialLookupCandidates } from './inventory-receipt.mapper';

type LooseTransaction = Transaction | null | undefined;
type ReceiptWhere = WhereOptions<InventoryReceiptAttributes>;

interface ReceiptListQuery {
    where: ReceiptWhere;
    offset: number;
    pageSize: number;
}

interface ReceiptListResult {
    count: number;
    rows: InventoryReceiptInstance[];
}

export async function findMaterialForItem(
    item: { material_id?: string | number | null } | null | undefined,
    transaction?: LooseTransaction,
): Promise<MaterialInstance> {
    const { code, numericId } = resolveMaterialLookupCandidates(item?.material_id);
    if (!code && !numericId) {
        throw createReceiptError('MATERIAL_ID_REQUIRED', { item });
    }

    let material: MaterialInstance | null = null;
    if (code) {
        material = await Material.findOne({ where: { code }, transaction: transaction ?? null });
    }
    if (!material && numericId) {
        material = await Material.findByPk(numericId, { transaction: transaction ?? null });
    }
    if (!material) {
        throw createReceiptError('MATERIAL_NOT_FOUND', { materialId: code || String(numericId) });
    }
    return material;
}

export async function listReversalReceipts(
    sourceReceiptId: number,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptInstance[]> {
    return await InventoryReceipt.findAll({
        where: {
            source_receipt_id: sourceReceiptId,
            direction: 'reversal',
        },
        transaction: transaction ?? null,
    });
}

export async function findReceiptById(
    receiptId: number,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptInstance | null> {
    return await InventoryReceipt.findByPk(receiptId, { transaction: transaction ?? null });
}

export async function findOrderWithItems(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<OrderInstance | null> {
    return await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: transaction ?? null,
    });
}

export async function createReceipt(
    payload: InventoryReceiptCreationAttributes,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptInstance> {
    return await InventoryReceipt.create(payload, { transaction: transaction ?? null });
}

export async function findReceiptsAndCount({
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

export async function findRelatedReversals(originalIds: number[]): Promise<InventoryReceiptInstance[]> {
    if (!Array.isArray(originalIds) || originalIds.length === 0) return [];
    return await InventoryReceipt.findAll({
        where: {
            direction: 'reversal',
            source_receipt_id: originalIds,
        },
    });
}

