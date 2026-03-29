import AppError from '../../app/errors/AppError';
import ERROR_CODES from '../../app/errors/errorCodes';
import * as repository from './inventory.repository';
import { toInventoryItem } from './inventory.mapper';
import { ensureDefaultWarehouseAndLocation } from './inventory-defaults';

type InventoryPayload = {
  stock_quantity?: number | string;
  min_stock?: number | string;
};

function readNumericId(value: unknown): number | null {
  const numeric = Number(String(value ?? '').trim());
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function readKeyword(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

async function listInventory(query: Record<string, unknown> = {}) {
  await ensureDefaultWarehouseAndLocation();
  const materials = await repository.listMaterials();
  const warehouseId = readNumericId(query.warehouseId);
  const locationId = readNumericId(query.locationId);
  const keyword = readKeyword(query.keyword);
  const lowStockOnly = String(query.lowStockOnly || '').trim().toLowerCase() === 'true';

  return materials
    .map(toInventoryItem)
    .filter((item) => {
      if (Number(item.stock_quantity || 0) <= 0) {
        return false;
      }
      if (warehouseId && !item.locations.some((entry: Record<string, unknown>) => Number(entry.warehouseId) === warehouseId && Number(entry.quantity || 0) > 0)) {
        return false;
      }
      if (locationId && !item.locations.some((entry: Record<string, unknown>) => Number(entry.locationId) === locationId && Number(entry.quantity || 0) > 0)) {
        return false;
      }
      if (lowStockOnly && !(Number(item.min_stock || 0) > 0 && Number(item.stock_quantity || 0) <= Number(item.min_stock || 0))) {
        return false;
      }
      if (!keyword) return true;
      return [
        item.code,
        item.model,
        item.name,
        item.supplier,
      ].some((candidate) => String(candidate || '').toLowerCase().includes(keyword));
    });
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

  if (Object.prototype.hasOwnProperty.call(payload, 'stock_quantity')) {
    throw new AppError({
      code: ERROR_CODES.STOCK_QUANTITY_IMMUTABLE,
      status: 400,
      details: {
        field: 'stock_quantity',
        message: '库存数量不可直接修改，请走调账',
      },
    });
  }

  const nextMin = payload.min_stock === undefined ? material.min_stock : Number(payload.min_stock);

  await material.update({
    min_stock: nextMin,
  });

  const refreshed = await repository.findMaterialWithBalancesById(material.id);
  return toInventoryItem(refreshed || material);
}

const inventoryService = { listInventory, updateInventoryItem };

export default inventoryService;
