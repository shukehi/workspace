import { computed, ref } from 'vue';
import { useInventoryStore } from '@/stores/useInventoryStore';
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
  const locationSearchQuery = ref('');
  const locationDialogOpen = ref(false);
  const locationDialogSaving = ref(false);
  const editingLocation = ref<InventoryLocation | null>(null);

  const filteredLocations = computed(() => {
    const query = locationSearchQuery.value.trim().toLowerCase();
    if (!query) return options.store.locations;
    return options.store.locations.filter((location) => {
      return [
        location.code,
        location.name,
        location.warehouse_name,
        location.remark,
      ].some((candidate) => String(candidate || '').toLowerCase().includes(query));
    });
  });

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
