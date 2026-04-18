import type { Ref } from 'vue';
import type { OutboundQuery } from '@/features/inventory/inventoryQueryBuilders';
import {
  createInventoryLocationFlow,
  createInventoryOutboundFlow,
  fetchAllInventoryOutboundsFlow,
  fetchInventoryLocationsFlow,
  fetchInventoryOutboundFlow,
  fetchInventoryOutboundsFlow,
  mergeInventoryLocation,
  reverseInventoryOutboundFlow,
  updateInventoryLocationFlow,
  type InventoryOutboundPayload,
} from '@/features/inventory/inventoryStoreFlows';
import type {
  InventoryLocation,
  InventoryOutbound,
  Warehouse,
} from '@/types/inventory';

export function createInventoryFlowActions(state: {
  warehouses: Ref<Warehouse[]>;
  locations: Ref<InventoryLocation[]>;
  outbounds: Ref<InventoryOutbound[]>;
  locationsLoading: Ref<boolean>;
  outboundsLoading: Ref<boolean>;
  outboundsTotal: Ref<number>;
  outboundsPage: Ref<number>;
  outboundsPageSize: Ref<number>;
}) {
  async function fetchInventoryLocations() {
    state.locationsLoading.value = true;
    try {
      const res = await fetchInventoryLocationsFlow();
      state.warehouses.value = Array.isArray(res?.warehouses) ? res.warehouses : [];
      state.locations.value = Array.isArray(res?.locations) ? res.locations : [];
      return res;
    } catch (e) {
      console.error('Failed to fetch inventory locations', e);
      throw e;
    } finally {
      state.locationsLoading.value = false;
    }
  }

  async function createInventoryLocation(payload: {
    warehouse_id: number;
    code: string;
    name: string;
    status?: 'active' | 'inactive';
    remark?: string;
    sort_order?: number;
  }) {
    const created = await createInventoryLocationFlow(payload);
    state.locations.value = mergeInventoryLocation(state.locations.value, created);
    return created;
  }

  async function updateInventoryLocation(id: number, payload: Partial<InventoryLocation>) {
    const updated = await updateInventoryLocationFlow(id, payload);
    state.locations.value = mergeInventoryLocation(state.locations.value, updated);
    return updated;
  }

  async function fetchInventoryOutbounds(params: OutboundQuery = {}) {
    state.outboundsLoading.value = true;
    try {
      const normalized = await fetchInventoryOutboundsFlow(params);
      state.outbounds.value = normalized.rows;
      state.outboundsTotal.value = normalized.total;
      state.outboundsPage.value = normalized.page;
      state.outboundsPageSize.value = normalized.pageSize;
    } catch (e) {
      state.outbounds.value = [];
      state.outboundsTotal.value = 0;
      console.error('Failed to fetch inventory outbounds', e);
      throw e;
    } finally {
      state.outboundsLoading.value = false;
    }
  }

  async function fetchInventoryOutbound(id: number | string) {
    return await fetchInventoryOutboundFlow(id);
  }

  async function fetchAllInventoryOutbounds(params: Omit<OutboundQuery, 'page' | 'pageSize'> = {}) {
    return await fetchAllInventoryOutboundsFlow(params);
  }

  async function createInventoryOutbound(payload: InventoryOutboundPayload) {
    return await createInventoryOutboundFlow(payload);
  }

  async function reverseInventoryOutbound(id: number | string, payload: {
    operator?: string;
    reason?: string;
    remark?: string;
    outbound_date?: string;
  } = {}) {
    return await reverseInventoryOutboundFlow(id, payload);
  }

  return {
    fetchInventoryLocations,
    createInventoryLocation,
    updateInventoryLocation,
    fetchInventoryOutbounds,
    fetchInventoryOutbound,
    fetchAllInventoryOutbounds,
    createInventoryOutbound,
    reverseInventoryOutbound,
  };
}
