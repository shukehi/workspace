import { ref } from 'vue';
import type { InventoryLocation } from '@/types/inventory';
import type { InventoryLocationPayload } from '@/features/inventory/inventoryStoreFlows';

export function useInventoryLocationDialogState(options: {
  createInventoryLocation: (payload: InventoryLocationPayload) => Promise<unknown>;
  updateInventoryLocation: (id: number, payload: InventoryLocationPayload) => Promise<unknown>;
  fetchInventoryLocations: () => Promise<unknown>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const locationDialogOpen = ref(false);
  const locationDialogSaving = ref(false);
  const editingLocation = ref<InventoryLocation | null>(null);

  async function handleLocationSubmit(payload: InventoryLocationPayload) {
    locationDialogSaving.value = true;
    const isEditing = Boolean(editingLocation.value);
    try {
      if (editingLocation.value) {
        await options.updateInventoryLocation(editingLocation.value.id, payload);
      } else {
        await options.createInventoryLocation(payload);
      }
      await options.fetchInventoryLocations();
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

  function openEditLocationDialog(location: InventoryLocation) {
    editingLocation.value = location;
    locationDialogOpen.value = true;
  }

  return {
    locationDialogOpen,
    locationDialogSaving,
    editingLocation,
    handleLocationSubmit,
    openCreateLocationDialog,
    openEditLocationDialog,
  };
}
