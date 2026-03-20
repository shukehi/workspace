import { InventoryLocation, InventoryLocationBalance, Material, Warehouse } from '../../models';

export async function listMaterials(): Promise<any[]> {
    return await Material.findAll({
        include: [{
            model: InventoryLocationBalance,
            as: 'locationBalances',
            required: false,
            include: [
                { model: Warehouse, as: 'warehouse', required: false },
                { model: InventoryLocation, as: 'location', required: false },
            ],
        }],
        order: [['updatedAt', 'DESC']],
    });
}

export async function findMaterialById(id: number | string): Promise<any> {
    return await Material.findByPk(id);
}
