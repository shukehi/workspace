import { api } from '@/lib/api';
import { buildInventoryQuery, type InventoryQuery } from '@/features/inventory/inventoryQueryBuilders';
import type {
  InventoryAdjustmentPayload,
  InventoryAdjustmentResponse,
  InventoryItem,
} from '@/types/inventory';

export async function fetchInventoryFlow(params: InventoryQuery = {}) {
  const suffix = buildInventoryQuery(params);
  const response = await api.get<InventoryItem[]>(`/inventory${suffix}`);
  return Array.isArray(response) ? response : [];
}

export async function updateInventoryMinStockFlow(id: number, minStock: number) {
  return await api.put<InventoryItem>(`/inventory/${id}`, {
    min_stock: minStock,
  });
}

export function mergeInventoryItem(items: InventoryItem[], nextItem: InventoryItem) {
  const index = items.findIndex((item) => item.id === nextItem.id);
  if (index === -1) {
    return [nextItem, ...items];
  }
  const next = [...items];
  next[index] = nextItem;
  return next;
}

export async function createInventoryAdjustmentFlow(payload: InventoryAdjustmentPayload) {
  return await api.post<InventoryAdjustmentResponse>('/inventory-adjustments', payload);
}
