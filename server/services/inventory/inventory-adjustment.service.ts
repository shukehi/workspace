import type { Transaction } from 'sequelize';
import { InventoryLocation, InventoryMovement, Material, Warehouse, sequelize } from '../../models';
import type {
    InventoryLocationInstance,
    InventoryMovementInstance,
    MaterialInstance,
    WarehouseInstance,
} from '../../models';
import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import * as balanceRepository from './inventory-balance.repository';
import * as inventoryRepository from './inventory.repository';
import { resolveWarehouseAndLocation } from './inventory-location.service';
import { applyInventoryMovement } from './inventory-movement.service';
import { toInventoryItem } from './inventory.mapper';

type InventoryAdjustmentPayload = {
    material_id?: number | string;
    warehouse_id?: number | string;
    location_id?: number | string;
    operation_key?: string;
    delta_quantity?: number | string;
    reason?: string;
    operator?: string;
    remark?: string;
    occurred_at?: string;
};

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMovementDuplicate(error: unknown) {
    const record = (error || {}) as Record<string, unknown>;
    const message = String(record.message || '');
    const fields = typeof record.fields === 'object' && record.fields !== null
        ? Object.keys(record.fields as Record<string, unknown>)
        : [];

    if (String(record.name || '') === 'SequelizeUniqueConstraintError') {
        return fields.includes('source_type') || fields.includes('source_id') || fields.includes('source_line_key');
    }

    return message.includes('idx_inventory_movements_source_unique')
        || (message.includes('inventory_movements.source_type') && message.includes('inventory_movements.source_id'));
}

function isSqliteBusy(error: unknown) {
    const record = (error || {}) as Record<string, unknown>;
    const code = String(record.code || (record as { original?: { code?: string } }).original?.code || '');
    const message = String(record.message || '');
    return code === 'SQLITE_BUSY' || message.includes('SQLITE_BUSY');
}

function normalizeOccurredAt(value: unknown): string {
    if (!value) return new Date().toISOString();
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError({
            code: ERROR_CODES.INVALID_RECEIPT_DATE,
            status: 400,
            details: { value },
        });
    }
    return parsed.toISOString();
}

function normalizeDeltaQuantity(value: unknown): number {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity === 0) {
        throw new AppError({
            code: ERROR_CODES.INVALID_RECEIPT_QUANTITY,
            status: 400,
            details: { value },
        });
    }
    return quantity;
}

function normalizeOperationKey(value: unknown): string {
    const key = normalizeText(value);
    if (!key) {
        throw new AppError({
            code: ERROR_CODES.VALIDATION_ERROR,
            status: 400,
            details: {
                field: 'operation_key',
                message: 'operation_key is required',
            },
        });
    }
    return key;
}

async function loadExistingAdjustment(
    operationKey: string,
    sourceLineKey: string,
    materialId: number,
) {
    const movement = await InventoryMovement.findOne({
        where: {
            source_type: 'manual_adjustment',
            source_id: operationKey,
            source_line_key: sourceLineKey,
        },
    }) as InventoryMovementInstance | null;

    if (!movement) return null;

    const [material, warehouse, location] = await Promise.all([
        inventoryRepository.findMaterialWithBalancesById(materialId),
        Warehouse.findByPk(movement.warehouse_id),
        InventoryLocation.findByPk(movement.location_id),
    ]);

    if (!material || !warehouse || !location) return null;

    return {
        movement: serializeMovement(
            movement,
            material as MaterialInstance,
            warehouse as WarehouseInstance,
            location as InventoryLocationInstance,
        ),
        item: toInventoryItem(material),
    };
}

function serializeMovement(
    movement: InventoryMovementInstance,
    material: MaterialInstance,
    warehouse: WarehouseInstance,
    location: InventoryLocationInstance,
) {
    const plainMovement = typeof movement.get === 'function' ? movement.get({ plain: true }) : movement;
    const plainMaterial = typeof material.get === 'function' ? material.get({ plain: true }) : material;
    const plainWarehouse = typeof warehouse.get === 'function' ? warehouse.get({ plain: true }) : warehouse;
    const plainLocation = typeof location.get === 'function' ? location.get({ plain: true }) : location;

    return {
        id: Number(plainMovement.id),
        source_type: plainMovement.source_type,
        source_id: plainMovement.source_id,
        source_line_key: plainMovement.source_line_key,
        material_id: Number(plainMovement.material_id),
        material_code: plainMaterial.code || '',
        material_name: plainMaterial.name || '',
        warehouse_id: Number(plainMovement.warehouse_id),
        warehouse_name: plainWarehouse.name || '',
        location_id: Number(plainMovement.location_id),
        location_code: plainLocation.code || '',
        location_name: plainLocation.name || '',
        delta_quantity: Number(plainMovement.delta_quantity || 0),
        balance_after: Number(plainMovement.balance_after || 0),
        stock_after: Number(plainMovement.stock_after || 0),
        reason: plainMovement.reason || '',
        operator: plainMovement.operator || '',
        remark: plainMovement.remark || '',
        occurred_at: plainMovement.occurred_at ? new Date(plainMovement.occurred_at).toISOString() : null,
    };
}

class InventoryAdjustmentService {
    async create(payload: InventoryAdjustmentPayload = {}) {
        const materialId = Number(payload.material_id);
        const operationKey = normalizeOperationKey(payload.operation_key);
        const deltaQuantity = normalizeDeltaQuantity(payload.delta_quantity);
        const reason = normalizeText(payload.reason);
        const occurredAt = normalizeOccurredAt(payload.occurred_at);
        const requestedWarehouseId = Number(payload.warehouse_id);
        const requestedLocationId = Number(payload.location_id);
        const duplicateSourceLineKey = `${materialId}:${requestedWarehouseId}:${requestedLocationId}`;

        const transaction = await sequelize.transaction();
        try {
            const { warehouse, location } = await resolveWarehouseAndLocation(payload.warehouse_id, payload.location_id, transaction);
            const sourceLineKey = `${materialId}:${warehouse.id}:${location.id}`;
            const material = await Material.findByPk(materialId, { transaction }) as MaterialInstance | null;
            if (!material) {
                throw new AppError({
                    code: ERROR_CODES.MATERIAL_NOT_FOUND,
                    status: 404,
                    details: { materialId: payload.material_id },
                });
            }

            const adjustment = await applyInventoryMovement({
                material,
                warehouseId: warehouse.id,
                locationId: location.id,
                sourceType: 'manual_adjustment',
                sourceId: operationKey,
                sourceLineKey: `${material.id}:${warehouse.id}:${location.id}`,
                deltaQuantity,
                reason,
                operator: normalizeText(payload.operator) || null,
                remark: normalizeText(payload.remark),
                occurredAt,
                metadata: {
                    category: 'manual_adjustment',
                    operation_key: operationKey,
                },
                transaction,
            });

            await transaction.commit();

            const refreshedMaterial = await inventoryRepository.findMaterialWithBalancesById(material.id);
            return {
                movement: adjustment.serializedMovement,
                item: toInventoryItem(refreshedMaterial || material),
            };
        } catch (error) {
            await transaction.rollback();
            if (isMovementDuplicate(error) || isSqliteBusy(error)) {
                for (let attempt = 0; attempt < 6; attempt += 1) {
                    const existing = await loadExistingAdjustment(operationKey, duplicateSourceLineKey, materialId);
                    if (existing) return existing;
                    await sleep(50);
                }
            }
            throw error;
        }
    }
}

const inventoryAdjustmentService = new InventoryAdjustmentService();

export default inventoryAdjustmentService;
