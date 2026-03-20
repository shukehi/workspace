import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import type { Transaction } from 'sequelize';
import type {
    InventoryLocationAttributes,
    WarehouseAttributes,
} from '../../models/types';
import type {
    InventoryLocationInstance,
    WarehouseInstance,
} from '../../models';
import * as repository from './inventory-location.repository';
import { ensureDefaultWarehouseAndLocation } from './inventory-defaults';

function normalizeText(value: unknown): string {
    return String(value || '').trim();
}

function normalizeStatus(value: unknown): 'active' | 'inactive' {
    return String(value || '').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function serializeWarehouse(warehouse: WarehouseAttributes | WarehouseInstance) {
    return {
        id: Number(warehouse.id),
        code: warehouse.code || '',
        name: warehouse.name || '',
        status: warehouse.status || 'active',
        remark: warehouse.remark || '',
    };
}

function serializeLocation(location: InventoryLocationAttributes & { warehouse?: WarehouseAttributes | WarehouseInstance | null }) {
    const warehouse = (location.warehouse || null) as WarehouseAttributes | WarehouseInstance | null;
    return {
        id: Number(location.id),
        code: location.code || '',
        name: location.name || '',
        warehouse_id: Number(location.warehouse_id || warehouse?.id || 0),
        warehouse_code: warehouse?.code || '',
        warehouse_name: warehouse?.name || '',
        status: location.status || 'active',
        remark: location.remark || '',
        sort_order: Number(location.sort_order || 0),
    };
}

function createInventoryError(code: string, details: Record<string, unknown> = {}) {
    return new AppError({
        code,
        status: 400,
        details,
    });
}

export async function resolveWarehouseAndLocation(
    warehouseIdInput: unknown,
    locationIdInput: unknown,
    transaction?: Transaction | null,
) {
    const warehouseId = Number(warehouseIdInput);
    const locationId = Number(locationIdInput);

    if ((!Number.isInteger(warehouseId) || warehouseId <= 0) && (!Number.isInteger(locationId) || locationId <= 0)) {
        return await ensureDefaultWarehouseAndLocation(transaction ?? null);
    }

    const location = Number.isInteger(locationId) && locationId > 0
        ? await repository.findLocationById(locationId, transaction ?? null)
        : null;

    if (!location) {
        throw createInventoryError(ERROR_CODES.LOCATION_NOT_FOUND, { locationId: locationIdInput });
    }

    const warehouse = location.warehouse
        || await repository.findWarehouseById(Number(location.warehouse_id), transaction ?? null);

    if (!warehouse) {
        throw createInventoryError(ERROR_CODES.WAREHOUSE_NOT_FOUND, { warehouseId: warehouseIdInput || location.warehouse_id });
    }

    if (Number.isInteger(warehouseId) && warehouseId > 0 && Number(location.warehouse_id) !== warehouseId) {
        throw createInventoryError(ERROR_CODES.LOCATION_WAREHOUSE_MISMATCH, {
            warehouseId,
            locationId: location.id,
        });
    }

    if (String(warehouse.status || 'active') !== 'active') {
        throw createInventoryError(ERROR_CODES.WAREHOUSE_NOT_FOUND, { warehouseId: warehouse.id });
    }
    if (String(location.status || 'active') !== 'active') {
        throw createInventoryError(ERROR_CODES.LOCATION_INACTIVE, { locationId: location.id });
    }

    return { warehouse, location };
}

class InventoryLocationService {
    async list() {
        await ensureDefaultWarehouseAndLocation();
        const [warehouses, locations] = await Promise.all([
            repository.listWarehouses(),
            repository.listLocations(),
        ]);

        return {
            warehouses: warehouses.map(serializeWarehouse),
            locations: locations.map(serializeLocation),
        };
    }

    async create(payload: Record<string, unknown> = {}) {
        const warehouseId = Number(payload.warehouse_id);
        if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
            throw createInventoryError(ERROR_CODES.WAREHOUSE_NOT_FOUND, { warehouseId: payload.warehouse_id });
        }

        const warehouse = await repository.findWarehouseById(warehouseId);
        if (!warehouse) {
            throw createInventoryError(ERROR_CODES.WAREHOUSE_NOT_FOUND, { warehouseId });
        }

        const created = await repository.createLocation({
            code: normalizeText(payload.code).toUpperCase(),
            name: normalizeText(payload.name),
            warehouse_id: warehouseId,
            status: normalizeStatus(payload.status),
            remark: normalizeText(payload.remark),
            sort_order: Number(payload.sort_order || 0),
        });

        const persisted = await repository.findLocationById(Number(created.id));
        return serializeLocation(persisted || created);
    }

    async update(id: number | string, payload: Record<string, unknown> = {}) {
        const location = await repository.findLocationById(Number(id));
        if (!location) {
            throw createInventoryError(ERROR_CODES.LOCATION_NOT_FOUND, { locationId: id });
        }

        const warehouseId = Number(location.warehouse_id);
        if (payload.warehouse_id !== undefined && Number(payload.warehouse_id) !== warehouseId) {
            throw createInventoryError(ERROR_CODES.LOCATION_WAREHOUSE_IMMUTABLE, {
                locationId: id,
                warehouseId: payload.warehouse_id,
            });
        }
        const warehouse = await repository.findWarehouseById(warehouseId);
        if (!warehouse) {
            throw createInventoryError(ERROR_CODES.WAREHOUSE_NOT_FOUND, { warehouseId });
        }

        await repository.updateLocation(location, {
            code: payload.code === undefined ? location.code : normalizeText(payload.code).toUpperCase(),
            name: payload.name === undefined ? location.name : normalizeText(payload.name),
            warehouse_id: warehouseId,
            status: payload.status === undefined ? location.status : normalizeStatus(payload.status),
            remark: payload.remark === undefined ? location.remark : normalizeText(payload.remark),
            sort_order: payload.sort_order === undefined ? Number(location.sort_order || 0) : Number(payload.sort_order || 0),
        });

        const persisted = await repository.findLocationById(Number(location.id));
        return serializeLocation(persisted || location);
    }
}

const inventoryLocationService = new InventoryLocationService();

export default inventoryLocationService;
