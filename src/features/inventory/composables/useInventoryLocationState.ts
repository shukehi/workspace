import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryLocationQueryState } from '@/features/inventory/composables/useInventoryLocationQueryState';
import { useInventoryLocationDialogState } from '@/features/inventory/composables/useInventoryLocationDialogState';
import type { InventoryLocationPayload } from '@/features/inventory/inventoryStoreFlows';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type InventoryStore = ReturnType<typeof useInventoryStore>;

export function useInventoryLocationState(options: {
  store: InventoryStore;
  toast: ToastFn;
}) {
  const {
    locationSearchQuery,
    filteredLocations,
  } = useInventoryLocationQueryState({
    locations: () => options.store.locations,
  });

  const {
    locationDialogOpen,
    locationDialogSaving,
    editingLocation,
    handleLocationSubmit,
    openCreateLocationDialog,
    openEditLocationDialog,
  } = useInventoryLocationDialogState({
    createInventoryLocation: options.store.createInventoryLocation,
    updateInventoryLocation: options.store.updateInventoryLocation,
    fetchInventoryLocations: options.store.fetchInventoryLocations,
    toast: options.toast,
  });

  return {
    locationSearchQuery,
    locationDialogOpen,
    locationDialogSaving,
    editingLocation,
    filteredLocations,
    handleLocationSubmit,
    openCreateLocationDialog,
    openEditLocationDialog,
  };
}
