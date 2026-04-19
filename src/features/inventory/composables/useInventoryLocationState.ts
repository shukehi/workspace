import { ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useInventoryLocationQueryState } from '@/features/inventory/composables/useInventoryLocationQueryState';
import type { InventoryLocation } from '@/types/inventory';
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
  const locationDialogOpen = ref(false);
  const locationDialogSaving = ref(false);
  const editingLocation = ref<InventoryLocation | null>(null);

  async function handleLocationSubmit(payload: InventoryLocationPayload) {
    locationDialogSaving.value = true;
    const isEditing = Boolean(editingLocation.value);
    try {
      if (editingLocation.value) {
        await options.store.updateInventoryLocation(editingLocation.value.id, payload);
      } else {
        await options.store.createInventoryLocation(payload);
      }
      await options.store.fetchInventoryLocations();
      locationDialogOpen.value = false;
      editingLocation.value = null;
      options.toast({
        title: isEditing ? '库位更新成功' : '库位创建成功',
        variant: 'success',
      });
    } catch {
      options.toast({
        title: '库位保存失败',
        description: '请检查库位编码是否重复后重试',
        variant: 'destructive',
      });
    } finally {
      locationDialogSaving.value = false;
    }
  }

  function openCreateLocationDialog() {
    editingLocation.value = null;
    locationDialogOpen.value = true;
  }

  return {
    locationSearchQuery,
    locationDialogOpen,
    locationDialogSaving,
    editingLocation,
    filteredLocations,
    handleLocationSubmit,
    openCreateLocationDialog,
  };
}
