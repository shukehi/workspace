const AppError = require('../../app/errors/AppError');
const ERROR_CODES = require('../../app/errors/errorCodes');
const repository = require('./inventory.repository');
const { toInventoryItem } = require('./inventory.mapper');

async function listInventory() {
  const materials = await repository.listMaterials();
  return materials.map(toInventoryItem);
}

async function updateInventoryItem(id, payload) {
  const material = await repository.findMaterialById(Number(id));
  if (!material) {
    throw new AppError({
      code: ERROR_CODES.NOT_FOUND,
      status: 404,
      message: 'Material not found',
      details: { message: 'Material not found' },
    });
  }

  const nextQty = Number(payload.stock_quantity);
  const nextMin = payload.min_stock === undefined ? material.min_stock : Number(payload.min_stock);

  await material.update({
    stock_quantity: nextQty,
    min_stock: nextMin,
  });

  return toInventoryItem(material);
}

module.exports = {
  listInventory,
  updateInventoryItem,
};
