import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import { api as defaultApi } from '@/lib/api';

export interface MaterialRecord {
  id: number;
  code: string;
  name: string;
  model: string;
  supplier: string;
  unit: string;
  price: number;
  category: string;
}

type EditableMaterial = Partial<MaterialRecord>;

interface MaterialManagementApi {
  get: typeof defaultApi.get;
  post: typeof defaultApi.post;
  put: typeof defaultApi.put;
}

interface MaterialManagementOptions {
  api?: MaterialManagementApi;
}

function createEmptyDraft(): EditableMaterial {
  return {
    code: '',
    name: '',
    model: '',
    supplier: '',
    unit: '',
    price: 0,
    category: '',
  };
}

export function useMaterialManagementPageState(options: MaterialManagementOptions = {}) {
  const api = options.api || defaultApi;

  const materials = ref<MaterialRecord[]>([]);
  const loading = ref(false);
  const searchQuery = ref('');
  const isEditDialogOpen = ref(false);
  const editingMaterial = ref<EditableMaterial>(createEmptyDraft());

  const dialogTitle = computed(() => (
    editingMaterial.value.id ? '编辑物料' : '新增物料'
  ));

  async function fetchMaterials(resetQuery?: string) {
    if (typeof resetQuery === 'string') {
      searchQuery.value = resetQuery;
    }

    loading.value = true;
    try {
      const response = await api.get<MaterialRecord[]>('/materials', {
        params: { q: searchQuery.value.trim() || undefined },
      });
      materials.value = Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  }

  function openCreateDialog() {
    editingMaterial.value = createEmptyDraft();
    isEditDialogOpen.value = true;
  }

  function openEditDialog(material: MaterialRecord) {
    editingMaterial.value = { ...material };
    isEditDialogOpen.value = true;
  }

  async function saveMaterial() {
    const payload = { ...editingMaterial.value };

    try {
      if (payload.id) {
        await api.put(`/materials/${payload.id}`, payload);
      } else {
        await api.post('/materials', payload);
      }

      isEditDialogOpen.value = false;
      await fetchMaterials();
    } catch (error) {
      console.error(error);
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      void fetchMaterials();
    });
  } else {
    void fetchMaterials();
  }

  return {
    materials,
    loading,
    searchQuery,
    isEditDialogOpen,
    editingMaterial,
    dialogTitle,
    fetchMaterials,
    openCreateDialog,
    openEditDialog,
    saveMaterial,
  };
}
