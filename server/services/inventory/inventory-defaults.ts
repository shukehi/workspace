import type { Transaction } from 'sequelize';
import { InventoryLocation, Warehouse } from '../../models';
import type { InventoryLocationInstance, WarehouseInstance } from '../../models';

export const DEFAULT_WAREHOUSE_CODE = 'DEFAULT';
export const DEFAULT_WAREHOUSE_NAME = '默认仓';
export const DEFAULT_LOCATION_CODE = 'UNASSIGNED';
export const DEFAULT_LOCATION_NAME = '待分配库位';

type LooseTransaction = Transaction | null | undefined;

export async function ensureDefaultWarehouseAndLocation(transaction?: LooseTransaction) {
    const [warehouse] = await Warehouse.findOrCreate({
        where: { code: DEFAULT_WAREHOUSE_CODE },
        defaults: {
            code: DEFAULT_WAREHOUSE_CODE,
            name: DEFAULT_WAREHOUSE_NAME,
            status: 'active',
            remark: '',
        },
        transaction: transaction ?? null,
    }) as unknown as [WarehouseInstance, boolean];

    const [location] = await InventoryLocation.findOrCreate({
        where: {
            warehouse_id: warehouse.id,
            code: DEFAULT_LOCATION_CODE,
        },
        defaults: {
            warehouse_id: warehouse.id,
            code: DEFAULT_LOCATION_CODE,
            name: DEFAULT_LOCATION_NAME,
            status: 'active',
            remark: '',
            sort_order: 0,
        },
        transaction: transaction ?? null,
    }) as unknown as [InventoryLocationInstance, boolean];

    return { warehouse, location };
}
