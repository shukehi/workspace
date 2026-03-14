import type { MaterialAttributes } from '../../models/types';

const { Material } = require('../../models');

async function listMaterials(): Promise<MaterialAttributes[]> {
    return await Material.findAll({
        order: [['updatedAt', 'DESC']],
    });
}

async function findMaterialById(id: number | string): Promise<MaterialAttributes | null> {
    return await Material.findByPk(id);
}

module.exports = {
    listMaterials,
    findMaterialById,
};
