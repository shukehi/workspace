import type { Transaction } from 'sequelize';
import type {
    InventoryLocationAttributes,
    InventoryLocationCreationAttributes,
} from '../../models/types';
import { InventoryLocation, Warehouse } from '../../models';
import type { InventoryLocationInstance, WarehouseInstance } from '../../models';

type LooseTransaction = Transaction | null | undefined;

export async function listWarehouses() {
    return await Warehouse.findAll({
        order: [['id', 'ASC']],
    }) as unknown as WarehouseInstance[];
}

export async function findWarehouseById(id: number, transaction?: LooseTransaction) {
    return await Warehouse.findByPk(id, { transaction: transaction ?? null }) as unknown as WarehouseInstance | null;
}

export async function listLocations() {
    return await InventoryLocation.findAll({
        include: [{ model: Warehouse, as: 'warehouse' }],
        order: [['sort_order', 'ASC'], ['id', 'ASC']],
    }) as unknown as InventoryLocationInstance[];
}

export async function findLocationById(id: number, transaction?: LooseTransaction) {
    return await InventoryLocation.findByPk(id, {
        include: [{ model: Warehouse, as: 'warehouse' }],
        transaction: transaction ?? null,
    }) as unknown as InventoryLocationInstance | null;
}

export async function createLocation(values: InventoryLocationCreationAttributes, transaction?: LooseTransaction) {
    return await InventoryLocation.create(values, { transaction: transaction ?? null }) as unknown as InventoryLocationInstance;
}

export async function updateLocation(
    location: InventoryLocationInstance,
    values: Partial<InventoryLocationAttributes>,
    transaction?: LooseTransaction,
) {
    return await location.update(values, { transaction: transaction ?? null });
}
