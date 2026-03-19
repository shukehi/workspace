import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import * as repository from './inventory.repository';
import { toInventoryItem } from './inventory.mapper';

type InventoryPayload = {
  stock_quantity: number | string;
  min_stock?: number | string;
};

async function listInventory() {
  const materials = await repository.listMaterials();
  return materials.map(toInventoryItem);
}

async function updateInventoryItem(id: number | string, payload: InventoryPayload) {
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

const inventoryService = { listInventory, updateInventoryItem };

export default inventoryService;
