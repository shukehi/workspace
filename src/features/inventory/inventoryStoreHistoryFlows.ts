import { api } from '@/lib/api';
import { buildMovementQuery, buildReceiptQuery, type MovementQuery, type ReceiptQuery } from '@/features/inventory/inventoryQueryBuilders';
import { fetchAllPagedRows, normalizePagedRowsResponse, type PagedRowsResponse } from '@/features/inventory/inventoryStorePaging';
import type {
  InventoryMovement,
  InventoryMovementListResponse,
  InventoryReceipt,
} from '@/types/inventory';

export type InventoryReceiptReversePayload = {
  operator?: string;
  remark?: string;
  reversed_at?: string;
  reverse_reason?: string;
  quantity?: number;
};

export async function fetchInventoryReceiptsFlow(params: ReceiptQuery = {}) {
  const suffix = buildReceiptQuery(params);
  const response = await api.get<PagedRowsResponse<InventoryReceipt>>(`/inventory-receipts${suffix}`);
  return normalizePagedRowsResponse(response, params);
}

export async function fetchAllInventoryReceiptsFlow(params: Omit<ReceiptQuery, 'page' | 'pageSize'> = {}) {
  return await fetchAllPagedRows<InventoryReceipt, Omit<ReceiptQuery, 'page' | 'pageSize'>>({
    params,
    fetchPage: async (pagedParams) => {
      const suffix = buildReceiptQuery(pagedParams);
      return await api.get<PagedRowsResponse<InventoryReceipt>>(`/inventory-receipts${suffix}`);
    },
  });
}

export async function fetchInventoryReceiptFlow(id: number | string) {
  return await api.get<InventoryReceipt>(`/inventory-receipts/${id}`);
}

export async function reverseReceiptFlow(
  id: number,
  payload: InventoryReceiptReversePayload = {},
) {
  return await api.post<InventoryReceipt>(`/inventory-receipts/${id}/reverse`, payload);
}

export async function fetchInventoryMovementsFlow(params: MovementQuery = {}) {
  const suffix = buildMovementQuery(params);
  const response = await api.get<InventoryMovementListResponse>(`/inventory-movements${suffix}`);
  return normalizePagedRowsResponse(response, { ...params, pageSize: params.pageSize || 20 });
}
