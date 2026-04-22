import { computed, ref } from 'vue';
import {
  materialMasterProfileApi,
  type MaterialMasterItem,
  type MaterialMasterReferenceCheck,
} from '@/services/materialMasterProfileApi';
import {
  supplierMasterProfileApi,
  type SupplierLinkedMaterialItem,
} from '@/services/supplierMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

interface MasterDataDiagnosticsApi {
  listMaterials?: () => Promise<MaterialMasterItem[]>;
  referenceCheck?: () => Promise<MaterialMasterReferenceCheck | null>;
  listSuppliers?: () => Promise<SupplierMasterEntry[]>;
  updateMaterial?: (id: number, payload: Partial<MaterialMasterItem>) => Promise<MaterialMasterItem>;
}

export function useMasterDataDiagnostics(options: { api?: MasterDataDiagnosticsApi } = {}) {
  const api = options.api || {
    listMaterials: () => materialMasterProfileApi.list(),
    referenceCheck: () => materialMasterProfileApi.referenceCheck(),
    listSuppliers: () => supplierMasterProfileApi.list(),
    updateMaterial: (id: number, payload: Partial<MaterialMasterItem>) => materialMasterProfileApi.update(id, payload),
  };

  const loading = ref(false);
  const loadError = ref<string | null>(null);
  const relinkingMaterialId = ref<number | null>(null);
  const materials = ref<MaterialMasterItem[]>([]);
  const referenceCheck = ref<MaterialMasterReferenceCheck | null>(null);
  const suppliers = ref<SupplierMasterEntry[]>([]);

  const supplierMap = computed(() => new Map(
    suppliers.value.map((item) => [String(item.supplierName || '').trim().toLowerCase(), item]),
  ));

  const materialIssues = computed(() => {
    const autoFixCandidates = materials.value
      .filter((item) => !item.supplier_master_id)
      .filter((item) => supplierMap.value.has(String(item.supplier || '').trim().toLowerCase()))
      .slice(0, 20)
      .map((item) => ({
        ...item,
        suggestedSupplierMaster: supplierMap.value.get(String(item.supplier || '').trim().toLowerCase()) || null,
      }));

    const manualReviewCandidates = materials.value
      .filter((item) => (
        (!item.supplier_master_id && !supplierMap.value.has(String(item.supplier || '').trim().toLowerCase()))
        || item.supplierMaster?.status === 'inactive'
      ))
      .slice(0, 20);

    const inactiveLinkedMaterials = materials.value
      .filter((item) => item.supplierMaster?.status === 'inactive')
      .slice(0, 20);

    const unlinkedMaterials = (referenceCheck.value?.unlinkedMaterialItems || []).slice(0, 20);

    return {
      unlinkedCount: referenceCheck.value?.unlinkedMaterialCount ?? materials.value.filter((item) => !item.supplier_master_id).length,
      autoFixCandidates,
      manualReviewCandidates,
      inactiveLinkedMaterials,
      unlinkedMaterials,
    };
  });

  const supplierIssues = computed(() => {
    const inactiveLinkedSuppliers = suppliers.value
      .filter((item) => item.hasLinkedMaterialsWhileInactive)
      .slice(0, 20);
    const suppliersWithUnlinkedMaterials = suppliers.value
      .filter((item) => item.materialCount > 0 && item.linkedMaterialCount === 0)
      .slice(0, 20);

    return {
      inactiveLinkedSuppliers,
      suppliersWithUnlinkedMaterials,
    };
  });

  const summary = computed(() => {
    const supplierIssueCount = supplierIssues.value.inactiveLinkedSuppliers.length + supplierIssues.value.suppliersWithUnlinkedMaterials.length;
    const materialIssueCount = materialIssues.value.unlinkedCount + materialIssues.value.inactiveLinkedMaterials.length;
    const autoFixCount = materialIssues.value.autoFixCandidates.length;
    const manualReviewCount = materialIssues.value.manualReviewCandidates.length + supplierIssueCount;

    return {
      totalIssueCount: materialIssueCount + supplierIssueCount,
      materialIssueCount,
      supplierIssueCount,
      autoFixCount,
      manualReviewCount,
    };
  });

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const [materialItems, materialReferenceCheck, supplierItems] = await Promise.all([
        api.listMaterials ? api.listMaterials() : materialMasterProfileApi.list(),
        api.referenceCheck ? api.referenceCheck() : materialMasterProfileApi.referenceCheck(),
        api.listSuppliers ? api.listSuppliers() : supplierMasterProfileApi.list(),
      ]);
      materials.value = Array.isArray(materialItems) ? materialItems : [];
      referenceCheck.value = materialReferenceCheck;
      suppliers.value = Array.isArray(supplierItems) ? supplierItems : [];
    } catch (error: any) {
      console.error(error);
      loadError.value = error?.message || '加载主数据统一诊断失败';
      materials.value = [];
      referenceCheck.value = null;
      suppliers.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function autoRelinkMaterial(item: MaterialMasterItem) {
    if (!item.id || !api.updateMaterial) return;
    relinkingMaterialId.value = item.id;
    try {
      await api.updateMaterial(item.id, {
        supplier: item.supplier,
        supplier_master_id: null,
      });
      await load();
    } catch (error) {
      console.error(error);
    } finally {
      relinkingMaterialId.value = null;
    }
  }

  return {
    loading,
    loadError,
    relinkingMaterialId,
    materials,
    suppliers,
    referenceCheck,
    materialIssues,
    supplierIssues,
    summary,
    load,
    autoRelinkMaterial,
  };
}
