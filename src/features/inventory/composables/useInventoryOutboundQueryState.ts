import { computed, ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import type { InventoryLocation, InventoryOutbound } from '@/types/inventory';

export function useInventoryOutboundQueryState(options: {
  activeLocations: () => InventoryLocation[];
  sortedOutbounds: () => InventoryOutbound[];
  outboundsTotal: () => number;
  outboundsPageSize: () => number;
}) {
  const outboundNoFilter = ref('');
  const outboundKeyword = ref('');
  const debouncedOutboundKeyword = refDebounced(outboundKeyword, 300);
  const outboundOperatorFilter = ref('');
  const outboundWarehouseFilter = ref('');
  const outboundLocationFilter = ref('');
  const outboundStartDate = ref('');
  const outboundEndDate = ref('');
  const outboundPage = ref(1);
  const outboundPageSize = ref(50);

  const availableOutboundLocations = computed(() => {
    const warehouseId = Number(outboundWarehouseFilter.value);
    const base = options.activeLocations();
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
    return base.filter((location) => location.warehouse_id === warehouseId);
  });

  const outboundSummary = computed(() => {
    const list = options.sortedOutbounds();
    const totalCount = list.length;
    const totalLocations = new Set(list.map((item) => item.location_id)).size;
    const totalIssuedQuantity = list
      .filter((item) => item.direction === 'out')
      .reduce((sum, item) => sum + item.items.reduce((itemSum, row) => itemSum + Number(row.quantity || 0), 0), 0);
    const totalReversedQuantity = list
      .filter((item) => item.direction === 'reversal')
      .reduce((sum, item) => sum + item.items.reduce((itemSum, row) => itemSum + Number(row.quantity || 0), 0), 0);

    return {
      totalCount,
      totalLocations,
      totalIssuedQuantity,
      netQuantity: totalIssuedQuantity - totalReversedQuantity,
    };
  });

  const outboundTotalPages = computed(() => Math.max(1, Math.ceil((options.outboundsTotal() || 0) / (options.outboundsPageSize() || 50))));

  return {
    outboundNoFilter,
    outboundKeyword,
    debouncedOutboundKeyword,
    outboundOperatorFilter,
    outboundWarehouseFilter,
    outboundLocationFilter,
    outboundStartDate,
    outboundEndDate,
    outboundPage,
    outboundPageSize,
    availableOutboundLocations,
    outboundSummary,
    outboundTotalPages,
  };
}
