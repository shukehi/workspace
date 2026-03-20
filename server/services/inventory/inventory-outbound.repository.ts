import type { Transaction } from 'sequelize';
import type {
    InventoryOutboundCreationAttributes,
    InventoryOutboundItemCreationAttributes,
} from '../../models/types';
import {
    InventoryLocation,
    InventoryOutbound,
    InventoryOutboundItem,
    Material,
    Warehouse,
} from '../../models';
import type {
    InventoryOutboundInstance,
    InventoryOutboundItemInstance,
    MaterialInstance,
} from '../../models';

type LooseTransaction = Transaction | null | undefined;

const OUTBOUND_INCLUDE = [
    { model: Warehouse, as: 'warehouse', required: false },
    { model: InventoryLocation, as: 'location', required: false },
    {
        model: InventoryOutboundItem,
        as: 'items',
        required: false,
        include: [{ model: Material, as: 'material', required: false }],
    },
];

export async function listOutbounds() {
    return await InventoryOutbound.findAll({
        include: OUTBOUND_INCLUDE,
        order: [['outbound_date', 'DESC'], ['created_at', 'DESC'], ['id', 'DESC']],
    }) as unknown as InventoryOutboundInstance[];
}

export async function findOutboundById(id: number, transaction?: LooseTransaction) {
    return await InventoryOutbound.findByPk(id, {
        include: OUTBOUND_INCLUDE,
        transaction: transaction ?? null,
    }) as unknown as InventoryOutboundInstance | null;
}

export async function createOutbound(values: InventoryOutboundCreationAttributes, transaction?: LooseTransaction) {
    return await InventoryOutbound.create(values, { transaction: transaction ?? null }) as unknown as InventoryOutboundInstance;
}

export async function createOutboundItems(values: InventoryOutboundItemCreationAttributes[], transaction?: LooseTransaction) {
    return await InventoryOutboundItem.bulkCreate(values, { transaction: transaction ?? null }) as unknown as InventoryOutboundItemInstance[];
}

export async function findReversals(sourceOutboundId: number, transaction?: LooseTransaction) {
    return await InventoryOutbound.findAll({
        where: {
            source_outbound_id: sourceOutboundId,
            direction: 'reversal',
        },
        transaction: transaction ?? null,
    }) as unknown as InventoryOutboundInstance[];
}

export async function markOutboundReversedIfPosted(
    outboundId: number,
    transaction?: LooseTransaction,
) {
    const [updated] = await InventoryOutbound.update(
        { status: 'reversed' },
        {
            where: {
                id: outboundId,
                direction: 'out',
                status: 'posted',
            },
            transaction: transaction ?? null,
        },
    );

    return Number(updated || 0);
}

export async function findMaterial(materialId: unknown, transaction?: LooseTransaction) {
    const normalized = String(materialId || '').trim();
    if (!normalized) return null;
    const numericId = Number(normalized);
    if (Number.isInteger(numericId) && numericId > 0) {
        const byId = await Material.findByPk(numericId, { transaction: transaction ?? null }) as unknown as MaterialInstance | null;
        if (byId) return byId;
    }
    return await Material.findOne({
        where: { code: normalized },
        transaction: transaction ?? null,
    }) as unknown as MaterialInstance | null;
}
