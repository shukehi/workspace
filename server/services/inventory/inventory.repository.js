const { Material } = require('../../models');

async function listMaterials() {
  return await Material.findAll({
    order: [['updatedAt', 'DESC']],
  });
}

async function findMaterialById(id) {
  return await Material.findByPk(id);
}

module.exports = {
  listMaterials,
  findMaterialById,
};
