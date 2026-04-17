import { api } from '@/lib/api';
import { buildOutboundQuery, type OutboundQuery } from '@/features/inventory/inventoryQueryBuilders';
import { fetchAllPagedRows, normalizePagedRowsResponse, type PagedRowsResponse } from '@/features/inventory/inventoryStorePaging';
import type {
  InventoryLocation,
  InventoryLocationListResponse,
  InventoryOutbound,
  InventoryOutboundListResponse,
} from '@/types/inventory';

type InventoryLocationPayload = {
  warehouse_id: number;
  code: string;
  name: string;
  status?: 'active' | 'inactive';
  remark?: string;
  sort_order?: number;
};

type InventoryOutboundPayload = {
  warehouse_id: number;
  location_id: number;
  operator?: string;
  reason: string;
  remark?: string;
  outbound_date?: string;
  items: Array<{
    material_id: number | string;
    item_name?: string;
    unit?: string;
    quantity: number;
  }>;
};

function sortLocations(locations: InventoryLocation[]) {
  return [...locations].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
}

export function mergeInventoryLocation(locations: InventoryLocation[], nextLocation: InventoryLocation) {
  return sortLocations([...locations.filter((item) => item.id !== nextLocation.id), nextLocation]);
}

export async function fetchInventoryLocationsFlow() {
  return await api.get<InventoryLocationListResponse>('/inventory-locations');
}

export async function createInventoryLocationFlow(payload: InventoryLocationPayload) {
  return await api.post<InventoryLocation>('/inventory-locations', payload);
}

export async function updateInventoryLocationFlow(id: number, payload: Partial<InventoryLocation>) {
  return await api.put<InventoryLocation>(`/inventory-locations/${id}`, payload);
}

export async function fetchInventoryOutboundsFlow(params: OutboundQuery = {}) {
  const suffix = buildOutboundQuery(params);
  const response = await api.get<InventoryOutboundListResponse>(`/inventory-outbounds${suffix}`);
  return normalizePagedRowsResponse(response, params);
}

export async function fetchAllInventoryOutboundsFlow(params: Omit<OutboundQuery, 'page' | 'pageSize'> = {}) {
  return await fetchAllPagedRows<InventoryOutbound, Omit<OutboundQuery, 'page' | 'pageSize'>>({
    params,
    fetchPage: async (pagedParams) => {
      const suffix = buildOutboundQuery(pagedParams);
      return await api.get<PagedRowsResponse<InventoryOutbound>>(`/inventory-outbounds${suffix}`);
    },
  });
}

export async function fetchInventoryOutboundFlow(id: number | string) {
  return await api.get<InventoryOutbound>(`/inventory-outbounds/${id}`);
}

export async function createInventoryOutboundFlow(payload: InventoryOutboundPayload) {
  return await api.post<InventoryOutbound>('/inventory-outbounds', payload);
}

export async function reverseInventoryOutboundFlow(id: number | string, payload: {
  operator?: string;
  reason?: string;
  remark?: string;
  outbound_date?: string;
} = {}) {
  return await api.post<InventoryOutbound>(`/inventory-outbounds/${id}/reverse`, payload);
}
