import type { Ref } from 'vue';
import type { MovementQuery, ReceiptQuery } from '@/features/inventory/inventoryQueryBuilders';
import {
  fetchAllInventoryReceiptsFlow,
  fetchInventoryMovementsFlow,
  fetchInventoryReceiptFlow,
  fetchInventoryReceiptsFlow,
  reverseReceiptFlow,
} from '@/features/inventory/inventoryStoreHistoryFlows';
import type { InventoryMovement, InventoryReceipt } from '@/types/inventory';

export function createInventoryHistoryActions(state: {
  receipts: Ref<InventoryReceipt[]>;
  receiptsLoading: Ref<boolean>;
  receiptsTotal: Ref<number>;
  receiptsPage: Ref<number>;
  receiptsPageSize: Ref<number>;
  movements: Ref<InventoryMovement[]>;
  movementsLoading: Ref<boolean>;
  movementsTotal: Ref<number>;
  movementsPage: Ref<number>;
  movementsPageSize: Ref<number>;
}) {
  async function fetchInventoryReceipts(params: ReceiptQuery = {}) {
    state.receiptsLoading.value = true;
    try {
      const normalized = await fetchInventoryReceiptsFlow(params);
      state.receipts.value = normalized.rows;
      state.receiptsTotal.value = normalized.total;
      state.receiptsPage.value = normalized.page;
      state.receiptsPageSize.value = normalized.pageSize;
    } catch (e) {
      state.receipts.value = [];
      state.receiptsTotal.value = 0;
      console.error('Failed to fetch inventory receipts', e);
      throw e;
    } finally {
      state.receiptsLoading.value = false;
    }
  }

  async function fetchAllInventoryReceipts(params: Omit<ReceiptQuery, 'page' | 'pageSize'> = {}) {
    return await fetchAllInventoryReceiptsFlow(params);
  }

  async function fetchInventoryReceipt(id: number | string) {
    return await fetchInventoryReceiptFlow(id);
  }

  async function reverseReceipt(
    id: number,
    payload: {
      operator?: string;
      remark?: string;
      reversed_at?: string;
      reverse_reason?: string;
      quantity?: number;
    } = {},
  ) {
    return await reverseReceiptFlow(id, payload);
  }

  async function fetchInventoryMovements(params: MovementQuery = {}) {
    state.movementsLoading.value = true;
    try {
      const normalized = await fetchInventoryMovementsFlow(params);
      state.movements.value = normalized.rows;
      state.movementsTotal.value = normalized.total;
      state.movementsPage.value = normalized.page;
      state.movementsPageSize.value = normalized.pageSize;
      return normalized;
    } catch (e) {
      state.movements.value = [];
      state.movementsTotal.value = 0;
      console.error('Failed to fetch inventory movements', e);
      throw e;
    } finally {
      state.movementsLoading.value = false;
    }
  }

  return {
    fetchInventoryReceipts,
    fetchAllInventoryReceipts,
    fetchInventoryReceipt,
    reverseReceipt,
    fetchInventoryMovements,
  };
}
