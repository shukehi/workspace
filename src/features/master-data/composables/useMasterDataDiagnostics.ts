import { computed, ref } from 'vue';
import {
  materialMasterProfileApi,
  type MaterialMasterItem,
  type MaterialMasterProfileDetail,
  type MaterialMasterReferenceCheck,
} from '@/services/materialMasterProfileApi';
import {
  supplierMasterProfileApi,
  type SupplierMasterProfileDetail,
} from '@/services/supplierMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';

interface MasterDataDiagnosticsApi {
  listMaterials?: () => Promise<MaterialMasterItem[]>;
  referenceCheck?: () => Promise<MaterialMasterReferenceCheck | null>;
  listSuppliers?: () => Promise<SupplierMasterEntry[]>;
  detailMaterialProfile?: () => Promise<MaterialMasterProfileDetail>;
  detailSupplierProfile?: () => Promise<SupplierMasterProfileDetail>;
  updateMaterial?: (id: number, payload: Partial<MaterialMasterItem>) => Promise<MaterialMasterItem>;
}

interface BatchRelinkResult {
  processed: number;
  succeeded: number;
  failed: number;
  failedIds: number[];
}

export function useMasterDataDiagnostics(options: { api?: MasterDataDiagnosticsApi } = {}) {
  const api = options.api || {
    listMaterials: () => materialMasterProfileApi.list(),
    referenceCheck: () => materialMasterProfileApi.referenceCheck(),
    listSuppliers: () => supplierMasterProfileApi.list(),
    detailMaterialProfile: () => materialMasterProfileApi.detail(),
    detailSupplierProfile: () => supplierMasterProfileApi.detail(),
    updateMaterial: (id: number, payload: Partial<MaterialMasterItem>) => materialMasterProfileApi.update(id, payload),
  };

  const loading = ref(false);
  const loadError = ref<string | null>(null);
  const relinkingMaterialIds = ref<number[]>([]);
  const batchRelinking = ref(false);
  const lastBatchRelinkResult = ref<BatchRelinkResult | null>(null);
  const materials = ref<MaterialMasterItem[]>([]);
  const referenceCheck = ref<MaterialMasterReferenceCheck | null>(null);
  const suppliers = ref<SupplierMasterEntry[]>([]);
  const materialProfileDetail = ref<MaterialMasterProfileDetail | null>(null);
  const supplierProfileDetail = ref<SupplierMasterProfileDetail | null>(null);

  const supplierMap = computed(() => new Map(
    suppliers.value.map((item) => [String(item.supplierName || '').trim().toLowerCase(), item]),
  ));

  const lifecycleIssues = computed(() => {
    const materialDraftRevision = materialProfileDetail.value?.draftRevision?.revision ?? null;
    const materialPublishedRevision = materialProfileDetail.value?.publishedRevision?.revision ?? null;
    const supplierDraftRevision = supplierProfileDetail.value?.draftRevision?.revision ?? null;
    const supplierPublishedRevision = supplierProfileDetail.value?.publishedRevision?.revision ?? null;

    const items: Array<{
      key: 'material_master' | 'supplier_master';
      title: string;
      profileCode: 'material_master' | 'supplier_master';
      draftRevision: number;
      publishedRevision: number | null;
    }> = [];

    if (materialDraftRevision) {
      items.push({
        key: 'material_master',
        title: '物料主数据存在待发布 draft',
        profileCode: 'material_master',
        draftRevision: materialDraftRevision,
        publishedRevision: materialPublishedRevision,
      });
    }

    if (supplierDraftRevision) {
      items.push({
        key: 'supplier_master',
        title: '供应商主数据存在待发布 draft',
        profileCode: 'supplier_master',
        draftRevision: supplierDraftRevision,
        publishedRevision: supplierPublishedRevision,
      });
    }

    return {
      materialHasPendingDraft: Number(materialDraftRevision || 0) > 0,
      supplierHasPendingDraft: Number(supplierDraftRevision || 0) > 0,
      items,
    };
  });

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
    const pendingPublishCount = lifecycleIssues.value.items.length;

    return {
      totalIssueCount: materialIssueCount + supplierIssueCount + pendingPublishCount,
      materialIssueCount,
      supplierIssueCount,
      autoFixCount,
      manualReviewCount,
      pendingPublishCount,
    };
  });

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const [materialItems, materialReferenceCheck, supplierItems, materialDetail, supplierDetail] = await Promise.all([
        api.listMaterials ? api.listMaterials() : materialMasterProfileApi.list(),
        api.referenceCheck ? api.referenceCheck() : materialMasterProfileApi.referenceCheck(),
        api.listSuppliers ? api.listSuppliers() : supplierMasterProfileApi.list(),
        api.detailMaterialProfile ? api.detailMaterialProfile() : materialMasterProfileApi.detail(),
        api.detailSupplierProfile ? api.detailSupplierProfile() : supplierMasterProfileApi.detail(),
      ]);
      materials.value = Array.isArray(materialItems) ? materialItems : [];
      referenceCheck.value = materialReferenceCheck;
      suppliers.value = Array.isArray(supplierItems) ? supplierItems : [];
      materialProfileDetail.value = materialDetail;
      supplierProfileDetail.value = supplierDetail;
    } catch (error: any) {
      console.error(error);
      loadError.value = error?.message || '加载主数据统一诊断失败';
      materials.value = [];
      referenceCheck.value = null;
      suppliers.value = [];
      materialProfileDetail.value = null;
      supplierProfileDetail.value = null;
    } finally {
      loading.value = false;
    }
  }

  async function relinkOne(item: MaterialMasterItem) {
    if (!item.id || !api.updateMaterial) {
      return false;
    }

    relinkingMaterialIds.value = [...new Set([...relinkingMaterialIds.value, item.id])];
    try {
      await api.updateMaterial(item.id, {
        supplier: item.supplier,
        supplier_master_id: null,
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      relinkingMaterialIds.value = relinkingMaterialIds.value.filter((id) => id !== item.id);
    }
  }

  async function autoRelinkMaterial(item: MaterialMasterItem) {
    const succeeded = await relinkOne(item);
    if (succeeded) {
      await load();
    }
  }

  async function autoRelinkMaterials(items: MaterialMasterItem[]) {
    const uniqueItems = items.filter((item, index, source) => item.id && source.findIndex((candidate) => candidate.id === item.id) === index);
    if (!uniqueItems.length) {
      lastBatchRelinkResult.value = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        failedIds: [],
      };
      return lastBatchRelinkResult.value;
    }

    batchRelinking.value = true;
    const failedIds: number[] = [];
    let succeeded = 0;

    for (const item of uniqueItems) {
      const ok = await relinkOne(item);
      if (ok) {
        succeeded += 1;
      } else if (item.id) {
        failedIds.push(item.id);
      }
    }

    lastBatchRelinkResult.value = {
      processed: uniqueItems.length,
      succeeded,
      failed: failedIds.length,
      failedIds,
    };

    batchRelinking.value = false;
    await load();
    return lastBatchRelinkResult.value;
  }

  return {
    loading,
    loadError,
    relinkingMaterialIds,
    batchRelinking,
    lastBatchRelinkResult,
    materials,
    suppliers,
    referenceCheck,
    materialProfileDetail,
    supplierProfileDetail,
    lifecycleIssues,
    materialIssues,
    supplierIssues,
    summary,
    load,
    autoRelinkMaterial,
    autoRelinkMaterials,
  };
}
