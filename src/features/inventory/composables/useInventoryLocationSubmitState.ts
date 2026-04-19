import { ref, type Ref } from 'vue';
import type { InventoryLocation } from '@/types/inventory';
import type { InventoryLocationPayload } from '@/features/inventory/inventoryStoreFlows';

export function useInventoryLocationSubmitState(options: {
  editingLocation: Ref<InventoryLocation | null>;
  locationDialogOpen: Ref<boolean>;
  createInventoryLocation: (payload: InventoryLocationPayload) => Promise<unknown>;
  updateInventoryLocation: (id: number, payload: InventoryLocationPayload) => Promise<unknown>;
  fetchInventoryLocations: () => Promise<unknown>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const locationDialogSaving = ref(false);

  async function handleLocationSubmit(payload: InventoryLocationPayload) {
    locationDialogSaving.value = true;
    const isEditing = Boolean(options.editingLocation.value);
    try {
      if (options.editingLocation.value) {
        await options.updateInventoryLocation(options.editingLocation.value.id, payload);
      } else {
        await options.createInventoryLocation(payload);
      }
      await options.fetchInventoryLocations();
      options.locationDialogOpen.value = false;
      options.editingLocation.value = null;
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

  return {
    locationDialogSaving,
    handleLocationSubmit,
  };
}
