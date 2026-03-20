import type { Transaction } from 'sequelize';
import { InventoryLocationBalance } from '../../models';
import type { InventoryLocationBalanceInstance } from '../../models';

type LooseTransaction = Transaction | null | undefined;

export async function findBalance(
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

export async function findOrCreateBalance(
    materialId: number,
    warehouseId: number,
    locationId: number,
    transaction?: LooseTransaction,
) {
    const [balance] = await InventoryLocationBalance.findOrCreate({
        where: {
            material_id: materialId,
            warehouse_id: warehouseId,
            location_id: locationId,
        },
        defaults: {
            material_id: materialId,
            warehouse_id: warehouseId,
            location_id: locationId,
            quantity: 0,
        },
        transaction: transaction ?? null,
    }) as unknown as [InventoryLocationBalanceInstance, boolean];

    return balance;
}
