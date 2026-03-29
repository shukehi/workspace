import { InventoryLocation, InventoryLocationBalance, InventoryMovement, Material, Warehouse } from '../../models';
import type {
    InventoryLocationInstance,
    InventoryMovementInstance,
    MaterialInstance,
    WarehouseInstance,
} from '../../models';
import type { InventoryMovementSourceType } from '../../models/types';
import type { Transaction } from 'sequelize';
import { Op } from 'sequelize';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import * as balanceRepository from './inventory-balance.repository';

type ApplyInventoryMovementPayload = {
    material: MaterialInstance;
    warehouseId: number;
    locationId: number;
    sourceType: InventoryMovementSourceType;
    sourceId: string;
    sourceLineKey: string;
    deltaQuantity: number;
    reason: string;
    operator?: string | null;
    remark?: string;
    occurredAt: string;
    metadata?: Record<string, unknown>;
    insufficientBalanceCode?: string;
    transaction: Transaction;
};

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function readAffectedRows(result: unknown): number {
    if (Array.isArray(result) && Array.isArray(result[0]) && typeof result[0][1] === 'number') {
        return result[0][1];
    }
    if (Array.isArray(result) && typeof result[1] === 'number') {
        return result[1];
    }
    return Number(result || 0);
}

async function serializeMovement(movement: InventoryMovementInstance) {
    const [material, warehouse, location] = await Promise.all([
        Material.findByPk(movement.material_id) as Promise<MaterialInstance | null>,
        Warehouse.findByPk(movement.warehouse_id) as Promise<WarehouseInstance | null>,
        InventoryLocation.findByPk(movement.location_id) as Promise<InventoryLocationInstance | null>,
    ]);

    return {
        id: Number(movement.id),
        source_type: movement.source_type,
        source_id: movement.source_id,
        source_line_key: movement.source_line_key,
        material_id: Number(movement.material_id),
        material_code: material?.code || '',
        material_name: material?.name || '',
        warehouse_id: Number(movement.warehouse_id),
        warehouse_name: warehouse?.name || '',
        location_id: Number(movement.location_id),
        location_code: location?.code || '',
        location_name: location?.name || '',
        delta_quantity: Number(movement.delta_quantity || 0),
        balance_after: Number(movement.balance_after || 0),
        stock_after: Number(movement.stock_after || 0),
        reason: movement.reason || '',
        operator: movement.operator || '',
        remark: movement.remark || '',
        occurred_at: movement.occurred_at ? new Date(movement.occurred_at).toISOString() : null,
    };
}

export async function applyInventoryMovement(payload: ApplyInventoryMovementPayload) {
    const {
        material,
        warehouseId,
        locationId,
        sourceType,
        sourceId,
        sourceLineKey,
        deltaQuantity,
        reason,
        operator,
        remark,
        occurredAt,
        metadata,
        insufficientBalanceCode,
        transaction,
    } = payload;

    await balanceRepository.findOrCreateBalance(material.id, warehouseId, locationId, transaction);

    const insufficientGuard = deltaQuantity < 0
        ? {
            quantity: {
                [Op.gte]: Math.abs(deltaQuantity),
            },
        }
        : {};

    const balanceIncrementResult = await InventoryLocationBalance.increment(
        { quantity: deltaQuantity },
        {
            where: {
                material_id: material.id,
                warehouse_id: warehouseId,
                location_id: locationId,
                ...insufficientGuard,
            },
            transaction,
        }
    );

    if (readAffectedRows(balanceIncrementResult) !== 1) {
        const balance = await balanceRepository.findBalance(material.id, warehouseId, locationId, transaction);
        throw new AppError({
            code: insufficientBalanceCode || ERROR_CODES.INVENTORY_BALANCE_NEGATIVE,
            status: 400,
            details: {
                materialId: material.id,
                warehouseId,
                locationId,
                deltaQuantity,
                availableQuantity: Number(balance?.quantity || 0),
            },
        });
    }

    const materialIncrementResult = await Material.increment(
        { stock_quantity: deltaQuantity },
        {
            where: {
                id: material.id,
                ...(deltaQuantity < 0 ? {
                    stock_quantity: {
                        [Op.gte]: Math.abs(deltaQuantity),
                    },
                } : {}),
            },
            transaction,
        }
    );

    if (readAffectedRows(materialIncrementResult) !== 1) {
        throw new AppError({
            code: insufficientBalanceCode || ERROR_CODES.INVENTORY_BALANCE_NEGATIVE,
            status: 400,
            details: {
                materialId: material.id,
                warehouseId,
                locationId,
                deltaQuantity,
                availableQuantity: Number(material.stock_quantity || 0),
            },
        });
    }

    const [balance, refreshedMaterial] = await Promise.all([
        balanceRepository.findBalance(material.id, warehouseId, locationId, transaction),
        Material.findByPk(material.id, { transaction }) as Promise<MaterialInstance | null>,
    ]);

    const movement = await InventoryMovement.create({
        material_id: material.id,
        warehouse_id: warehouseId,
        location_id: locationId,
        source_type: sourceType,
        source_id: sourceId,
        source_line_key: sourceLineKey,
        delta_quantity: deltaQuantity,
        balance_after: Number(balance?.quantity || 0),
        stock_after: Number(refreshedMaterial?.stock_quantity || 0),
        reason: normalizeText(reason),
        operator: normalizeText(operator) || null,
        remark: normalizeText(remark),
        occurred_at: occurredAt,
        metadata_json: JSON.stringify(metadata || {}),
    }, { transaction }) as InventoryMovementInstance;

    return {
        movement,
        serializedMovement: await serializeMovement(movement),
        balanceAfter: Number(balance?.quantity || 0),
        stockAfter: Number(refreshedMaterial?.stock_quantity || 0),
    };
}
