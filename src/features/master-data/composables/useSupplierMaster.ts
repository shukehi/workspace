import { computed, ref } from 'vue';
import { supplierMasterApi } from '@/services/supplierMasterApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';
import {
  supplierMasterProfileApi,
  type SupplierLinkedMaterialItem,
  type SupplierMasterProfileDetail,
} from '@/services/supplierMasterProfileApi';

interface SupplierMasterPageApi {
  detail?: () => Promise<SupplierMasterProfileDetail>;
  list?: () => Promise<SupplierMasterEntry[]>;
  create?: (payload: { supplierName: string; sourceNote?: string; status?: 'active' | 'inactive' }) => Promise<any>;
  update?: (id: number, payload: { supplierName?: string; sourceNote?: string; status?: 'active' | 'inactive' }) => Promise<any>;
  archive?: (id: number) => Promise<any>;
  auditLogs?: () => Promise<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>;
  linkedMaterials?: (id: number) => Promise<SupplierLinkedMaterialItem[]>;
}

export function useSupplierMaster(options: { api?: SupplierMasterPageApi } = {}) {
  const api = options.api || supplierMasterProfileApi;
  const loading = ref(false);
  const saving = ref(false);
  const loadError = ref<string | null>(null);
  const searchQuery = ref('');
  const items = ref<SupplierMasterEntry[]>([]);
  const profileDetail = ref<SupplierMasterProfileDetail | null>(null);
  const auditLogs = ref<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>([]);
  const linkedMaterials = ref<SupplierLinkedMaterialItem[]>([]);
  const selectedSupplier = ref<SupplierMasterEntry | null>(null);
  const linkedMaterialsLoading = ref(false);
  const isEditDialogOpen = ref(false);
  const editingItem = ref<Partial<SupplierMasterEntry>>({ supplierName: '', sourceNote: '', status: 'active' });

  const filteredItems = computed(() => {
    const keyword = searchQuery.value.trim().toLowerCase();
    if (!keyword) return items.value;
    return items.value.filter((item) => (
      item.supplierName.toLowerCase().includes(keyword)
      || item.sources.some((source) => source.toLowerCase().includes(keyword))
    ));
  });

  const relationshipHealth = computed(() => {
    const allItems = items.value;
    const inactiveLinkedSuppliers = allItems.filter((item) => item.hasLinkedMaterialsWhileInactive);
    const suppliersWithUnlinkedMaterials = allItems.filter((item) => item.materialCount > 0 && item.linkedMaterialCount === 0);
    const totalLinkedMaterials = allItems.reduce((sum, item) => sum + Number(item.linkedMaterialCount || 0), 0);
    return {
      totalSuppliers: allItems.length,
      totalLinkedMaterials,
      inactiveLinkedSupplierCount: inactiveLinkedSuppliers.length,
      suppliersWithUnlinkedMaterialsCount: suppliersWithUnlinkedMaterials.length,
      inactiveLinkedSuppliers: inactiveLinkedSuppliers.slice(0, 5),
      suppliersWithUnlinkedMaterials: suppliersWithUnlinkedMaterials.slice(0, 5),
    };
  });

  const actionableRelationshipGroups = computed(() => ({
    inactiveLinkedSuppliers: items.value
      .filter((item) => item.hasLinkedMaterialsWhileInactive)
      .slice(0, 5),
    suppliersWithUnlinkedMaterials: items.value
      .filter((item) => item.materialCount > 0 && item.linkedMaterialCount === 0)
      .slice(0, 5),
  }));

  const auditTrendSummary = computed(() => {
    const recentLogs = auditLogs.value.slice(0, 5);
    const counts = recentLogs.reduce((acc, log) => {
      const action = String(log.action || 'other');
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return {
      sampleSize: recentLogs.length,
      createCount: counts.create || 0,
      updateCount: counts.update || 0,
      archiveCount: counts.archive || 0,
      latestCreatedAt: recentLogs[0]?.createdAt || null,
    };
  });

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      if (api.detail) {
        profileDetail.value = await api.detail();
      } else {
        profileDetail.value = await supplierMasterProfileApi.detail();
      }
      items.value = Array.isArray(profileDetail.value.collection?.previewItems) && profileDetail.value.collection.previewItems.length > 0
        ? profileDetail.value.collection.previewItems
        : api.list
          ? await api.list()
          : await supplierMasterProfileApi.list();
      auditLogs.value = api.auditLogs
        ? await api.auditLogs()
        : await supplierMasterProfileApi.auditLogs();
      if (selectedSupplier.value?.id) {
        await loadLinkedMaterials(Number(selectedSupplier.value.id));
      } else {
        linkedMaterials.value = [];
      }
    } catch (error: any) {
      console.error(error);
      loadError.value = error?.message || '加载供应商主数据失败';
      profileDetail.value = null;
      items.value = await supplierMasterApi.list().catch(() => []);
      auditLogs.value = [];
      linkedMaterials.value = [];
    } finally {
      loading.value = false;
    }
  }

  const dialogTitle = computed(() => editingItem.value.id ? '编辑供应商主数据' : '新增供应商主数据');

  function openCreateDialog() {
    editingItem.value = { supplierName: '', sourceNote: '', status: 'active' };
    isEditDialogOpen.value = true;
  }

  function openEditDialog(item: SupplierMasterEntry) {
    editingItem.value = {
      id: item.id ?? null,
      supplierName: item.supplierName,
      normalizedName: item.normalizedName,
      sourceNote: item.sourceNote || '',
      status: item.status || 'active',
    };
    isEditDialogOpen.value = true;
  }

  async function saveItem() {
    saving.value = true;
    try {
      if (editingItem.value.id) {
        await (api.update || supplierMasterProfileApi.update)(Number(editingItem.value.id), {
          supplierName: String(editingItem.value.supplierName || ''),
          sourceNote: String(editingItem.value.sourceNote || ''),
          status: (editingItem.value.status as 'active' | 'inactive') || 'active',
        });
      } else {
        await (api.create || supplierMasterProfileApi.create)({
          supplierName: String(editingItem.value.supplierName || ''),
          sourceNote: String(editingItem.value.sourceNote || ''),
          status: (editingItem.value.status as 'active' | 'inactive') || 'active',
        });
      }
      isEditDialogOpen.value = false;
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      saving.value = false;
    }
  }

  async function archiveItem(item: SupplierMasterEntry) {
    if (!item.id) return;
    saving.value = true;
    try {
      await (api.archive || supplierMasterProfileApi.archive)(Number(item.id));
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      saving.value = false;
    }
  }

  async function loadLinkedMaterials(id: number, supplier?: SupplierMasterEntry) {
    linkedMaterialsLoading.value = true;
    try {
      selectedSupplier.value = supplier || items.value.find((item) => Number(item.id || 0) === id) || null;
      linkedMaterials.value = api.linkedMaterials
        ? await api.linkedMaterials(id)
        : await supplierMasterProfileApi.linkedMaterials(id);
    } catch (error) {
      console.error(error);
      linkedMaterials.value = [];
    } finally {
      linkedMaterialsLoading.value = false;
    }
  }

  return {
    loading,
    saving,
    loadError,
    searchQuery,
    items,
    profileDetail,
    auditLogs,
    linkedMaterials,
    selectedSupplier,
    linkedMaterialsLoading,
    filteredItems,
    relationshipHealth,
    actionableRelationshipGroups,
    auditTrendSummary,
    isEditDialogOpen,
    editingItem,
    dialogTitle,
    load,
    openCreateDialog,
    openEditDialog,
    saveItem,
    archiveItem,
    loadLinkedMaterials,
  };
}
