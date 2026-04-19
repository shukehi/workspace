import { computed, ref } from 'vue';
import type { InventoryLocation } from '@/types/inventory';

export function useInventoryLocationQueryState(options: {
  locations: () => InventoryLocation[];
}) {
  const locationSearchQuery = ref('');

  const filteredLocations = computed(() => {
    const query = locationSearchQuery.value.trim().toLowerCase();
    if (!query) return options.locations();
    return options.locations().filter((location) => {
      return [
        location.code,
        location.name,
        location.warehouse_name,
        location.remark,
      ].some((candidate) => String(candidate || '').toLowerCase().includes(query));
    });
  });

  return {
    locationSearchQuery,
    filteredLocations,
  };
}
