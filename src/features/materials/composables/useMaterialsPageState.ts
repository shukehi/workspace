import { computed, ref } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';

export type MaterialsTabKey = 'raw' | 'hardware' | 'packaging';

const MATERIALS_TABS: Array<{ key: MaterialsTabKey; label: string }> = [
  { key: 'raw', label: '原材料' },
  { key: 'hardware', label: '五金配件' },
  { key: 'packaging', label: '包装材料' },
];

export function useMaterialsPageState() {
  const sourceStore = useSourceStore();
  const activeTab = ref<MaterialsTabKey>('raw');

  const tabs = computed(() => MATERIALS_TABS);

  function setActiveTab(tab: MaterialsTabKey) {
    activeTab.value = tab;
  }

  return {
    activeTab,
    tabs,
    hasOrder: computed(() => sourceStore.hasOrder),
    flatMaterials: computed(() => sourceStore.flatMaterials),
    flatCylinders: computed(() => sourceStore.flatCylinders),
    flatLocks: computed(() => sourceStore.flatLocks),
    flatHandles: computed(() => sourceStore.flatHandles),
    flatAccessories: computed(() => sourceStore.flatAccessories),
    flatForks: computed(() => sourceStore.flatForks),
    flatPackaging: computed(() => sourceStore.flatPackaging),
    setActiveTab,
  };
}
