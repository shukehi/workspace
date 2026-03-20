import type { MaterialAttributes } from '../../models/types';

import { Material } from '../../models';

export async function listMaterials(): Promise<any[]> {
    return await Material.findAll({
        order: [['updatedAt', 'DESC']],
    });
}

export async function findMaterialById(id: number | string): Promise<any> {
    return await Material.findByPk(id);
}

