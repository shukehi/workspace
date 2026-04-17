import type { Ref } from 'vue';
import {
  createInventoryAdjustmentFlow,
  fetchInventoryFlow,
  mergeInventoryItem,
  updateInventoryMinStockFlow,
} from '@/features/inventory/inventoryStoreCoreFlows';
import type { InventoryQuery } from '@/features/inventory/inventoryQueryBuilders';
import type {
  InventoryAdjustmentPayload,
  InventoryItem,
} from '@/types/inventory';

export function createInventoryCoreActions(state: {
  items: Ref<InventoryItem[]>;
  loading: Ref<boolean>;
}) {
  async function fetchInventory(params: InventoryQuery = {}) {
    state.loading.value = true;
    try {
      state.items.value = await fetchInventoryFlow(params);
    } catch (e) {
      console.error('Failed to fetch inventory', e);
      throw e;
    } finally {
      state.loading.value = false;
    }
  }

  async function updateMinStock(id: number, minStock: number) {
    try {
      const updated = await updateInventoryMinStockFlow(id, minStock);
      state.items.value = mergeInventoryItem(state.items.value, updated);
      return updated;
    } catch (e) {
      console.error('Failed to update stock', e);
      throw e;
    }
  }

  async function createInventoryAdjustment(payload: InventoryAdjustmentPayload) {
    try {
      const res = await createInventoryAdjustmentFlow(payload);
      const item = res?.item;
      if (item && typeof item.id === 'number') {
        state.items.value = mergeInventoryItem(state.items.value, item);
      }
      return res;
    } catch (e) {
      console.error('Failed to create inventory adjustment', e);
      throw e;
    }
  }

  return {
    fetchInventory,
    updateMinStock,
    createInventoryAdjustment,
  };
}
