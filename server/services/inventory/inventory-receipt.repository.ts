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
import { InventoryLocation, InventoryLocationBalance, InventoryReceipt, Material, Order, OrderItem, Warehouse } from '../../models';
import type {
    InventoryLocationBalanceInstance,
} from '../../models';
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

const RECEIPT_INCLUDE = [
    { model: Warehouse, as: 'warehouse', required: false },
    { model: InventoryLocation, as: 'location', required: false },
];

export async function findMaterialForItem(
    item: { material_id?: string | number | null; resolved_material_id?: string | number | null } | null | undefined,
    transaction?: LooseTransaction,
): Promise<MaterialInstance> {
    const resolvedMaterialId = Number(item?.resolved_material_id);
    if (Number.isInteger(resolvedMaterialId) && resolvedMaterialId > 0) {
        const resolvedMaterial = await Material.findByPk(resolvedMaterialId, { transaction: transaction ?? null }) as unknown as MaterialInstance | null;
        if (!resolvedMaterial) {
            throw createReceiptError('MATERIAL_NOT_FOUND', { materialId: String(resolvedMaterialId) });
        }
        return resolvedMaterial;
    }

    const { code, numericId } = resolveMaterialLookupCandidates(item?.material_id);
    if (!code && !numericId) {
        throw createReceiptError('MATERIAL_ID_REQUIRED', { item });
    }

    let material: MaterialInstance | null = null;
    if (code) {
        material = await Material.findOne({ where: { code }, transaction: transaction ?? null }) as unknown as MaterialInstance | null;
    }
    if (!material && numericId) {
        material = await Material.findByPk(numericId, { transaction: transaction ?? null }) as unknown as MaterialInstance | null;
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
        include: RECEIPT_INCLUDE,
        transaction: transaction ?? null,
    }) as unknown as InventoryReceiptInstance[];
}

export async function findReceiptById(
    receiptId: number,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptInstance | null> {
    return await InventoryReceipt.findByPk(receiptId, {
        include: RECEIPT_INCLUDE,
        transaction: transaction ?? null,
    }) as unknown as InventoryReceiptInstance | null;
}

export async function findOrderWithItems(
    orderId: number,
    transaction?: LooseTransaction,
): Promise<OrderInstance | null> {
    return await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction: transaction ?? null,
    }) as unknown as OrderInstance | null;
}

export async function createReceipt(
    payload: InventoryReceiptCreationAttributes,
    transaction?: LooseTransaction,
): Promise<InventoryReceiptInstance> {
    return await InventoryReceipt.create(payload, { transaction: transaction ?? null }) as unknown as InventoryReceiptInstance;
}

export async function claimReceiptReverseLock(
    receiptId: number,
    expectedReverseVersion: number,
    transaction?: LooseTransaction,
) {
    const [updated] = await InventoryReceipt.update(
        {
            reverse_version: expectedReverseVersion + 1,
            updated_at: new Date(),
        },
        {
            where: {
                id: receiptId,
                reverse_version: expectedReverseVersion,
            },
            transaction: transaction ?? null,
        },
    );

    return Number(updated || 0);
}

export async function findReceiptsAndCount({
    where,
    offset,
    pageSize,
}: ReceiptListQuery): Promise<ReceiptListResult> {
    return await InventoryReceipt.findAndCountAll({
        where,
        include: RECEIPT_INCLUDE,
        order: [['receipt_date', 'DESC'], ['created_at', 'DESC']],
        offset,
        limit: pageSize,
    }) as unknown as ReceiptListResult;
}

export async function findRelatedReversals(originalIds: number[]): Promise<InventoryReceiptInstance[]> {
    if (!Array.isArray(originalIds) || originalIds.length === 0) return [];
    return await InventoryReceipt.findAll({
        where: {
            direction: 'reversal',
            source_receipt_id: originalIds,
        },
        include: RECEIPT_INCLUDE,
    }) as unknown as InventoryReceiptInstance[];
}

export async function findLocationBalance(
    materialId: number,
    warehouseId: number,
    locationId: number,
    transaction?: LooseTransaction,
) {
    return await InventoryLocationBalance.findOne({
        where: {
            material_id: materialId,
            warehouse_id: warehouseId,
            location_id: locationId,
        },
        transaction: transaction ?? null,
    }) as unknown as InventoryLocationBalanceInstance | null;
}
