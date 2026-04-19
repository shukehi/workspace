import { ref } from 'vue';
import type { InventoryLocation } from '@/types/inventory';

export function useInventoryLocationDialogState() {
  const locationDialogOpen = ref(false);
  const editingLocation = ref<InventoryLocation | null>(null);

  function openCreateLocationDialog() {
    editingLocation.value = null;
    locationDialogOpen.value = true;
  }

  function openEditLocationDialog(location: InventoryLocation) {
    editingLocation.value = location;
    locationDialogOpen.value = true;
  }

  return {
    locationDialogOpen,
    editingLocation,
    openCreateLocationDialog,
    openEditLocationDialog,
  };
}
