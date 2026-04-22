import { computed, ref } from 'vue';
import { materialMasterProfileApi } from '@/services/materialMasterProfileApi';
import { supplierMasterProfileApi } from '@/services/supplierMasterProfileApi';
import type { SupplierMasterEntry } from '@/services/mappingConfigApi';
import type { MaterialMasterItem, MaterialMasterProfileDetail, MaterialMasterReferenceCheck } from '@/services/materialMasterProfileApi';
import type { SupplierMasterProfileDetail } from '@/services/supplierMasterProfileApi';

interface MasterDataGovernanceApi {
  detailMaterialProfile?: () => Promise<MaterialMasterProfileDetail>;
  detailSupplierProfile?: () => Promise<SupplierMasterProfileDetail>;
  listMaterials?: () => Promise<MaterialMasterItem[]>;
  listSuppliers?: () => Promise<SupplierMasterEntry[]>;
  materialReferenceCheck?: () => Promise<MaterialMasterReferenceCheck | null>;
  materialAuditLogs?: () => Promise<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>;
  supplierAuditLogs?: () => Promise<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>;
}

export function useMasterDataGovernance(options: { api?: MasterDataGovernanceApi } = {}) {
  const api = options.api || {
    detailMaterialProfile: () => materialMasterProfileApi.detail(),
    detailSupplierProfile: () => supplierMasterProfileApi.detail(),
    listMaterials: () => materialMasterProfileApi.list(),
    listSuppliers: () => supplierMasterProfileApi.list(),
    materialReferenceCheck: () => materialMasterProfileApi.referenceCheck(),
    materialAuditLogs: () => materialMasterProfileApi.auditLogs(),
    supplierAuditLogs: () => supplierMasterProfileApi.auditLogs(),
  };

  const loading = ref(false);
  const loadError = ref<string | null>(null);
  const materialProfileDetail = ref<MaterialMasterProfileDetail | null>(null);
  const supplierProfileDetail = ref<SupplierMasterProfileDetail | null>(null);
  const materials = ref<MaterialMasterItem[]>([]);
  const suppliers = ref<SupplierMasterEntry[]>([]);
  const materialReferenceCheck = ref<MaterialMasterReferenceCheck | null>(null);
  const materialAuditLogs = ref<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>([]);
  const supplierAuditLogs = ref<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>([]);

  const supplierMap = computed(() => new Map(
    suppliers.value.map((item) => [String(item.supplierName || '').trim().toLowerCase(), item]),
  ));

  const issueSummary = computed(() => {
    const autoFixCount = materials.value
      .filter((item) => !item.supplier_master_id)
      .filter((item) => supplierMap.value.has(String(item.supplier || '').trim().toLowerCase()))
      .length;
    const manualReviewMaterials = materials.value
      .filter((item) => (
        (!item.supplier_master_id && !supplierMap.value.has(String(item.supplier || '').trim().toLowerCase()))
        || item.supplierMaster?.status === 'inactive'
      ))
      .length;
    const inactiveLinkedSuppliersCount = suppliers.value.filter((item) => item.hasLinkedMaterialsWhileInactive).length;
    const suppliersWithUnlinkedMaterialsCount = suppliers.value.filter((item) => item.materialCount > 0 && item.linkedMaterialCount === 0).length;
    const unlinkedMaterialCount = materialReferenceCheck.value?.unlinkedMaterialCount ?? materials.value.filter((item) => !item.supplier_master_id).length;
    const inactiveLinkedMaterialCount = materials.value.filter((item) => item.supplierMaster?.status === 'inactive').length;
    const pendingPublishCount = Number(Boolean(materialProfileDetail.value?.draftRevision)) + Number(Boolean(supplierProfileDetail.value?.draftRevision));

    return {
      totalIssueCount: unlinkedMaterialCount + inactiveLinkedMaterialCount + inactiveLinkedSuppliersCount + suppliersWithUnlinkedMaterialsCount + pendingPublishCount,
      materialIssueCount: unlinkedMaterialCount + inactiveLinkedMaterialCount,
      supplierIssueCount: inactiveLinkedSuppliersCount + suppliersWithUnlinkedMaterialsCount,
      autoFixCount,
      manualReviewCount: manualReviewMaterials + inactiveLinkedSuppliersCount + suppliersWithUnlinkedMaterialsCount,
      pendingPublishCount,
      unlinkedMaterialCount,
      inactiveLinkedMaterialCount,
      inactiveLinkedSuppliersCount,
      suppliersWithUnlinkedMaterialsCount,
    };
  });

  const profileGovernance = computed(() => ([
    {
      code: 'material_master' as const,
      title: '物料主数据',
      totalItems: materials.value.length,
      latestRevision: materialProfileDetail.value?.latestRevision?.revision ?? null,
      draftRevision: materialProfileDetail.value?.draftRevision?.revision ?? null,
      publishedRevision: materialProfileDetail.value?.publishedRevision?.revision ?? null,
      activeRevision: materialProfileDetail.value?.profile.activeRevision ?? null,
      hasPendingDraft: Boolean(materialProfileDetail.value?.draftRevision),
    },
    {
      code: 'supplier_master' as const,
      title: '供应商主数据',
      totalItems: suppliers.value.length,
      latestRevision: supplierProfileDetail.value?.latestRevision?.revision ?? null,
      draftRevision: supplierProfileDetail.value?.draftRevision?.revision ?? null,
      publishedRevision: supplierProfileDetail.value?.publishedRevision?.revision ?? null,
      activeRevision: supplierProfileDetail.value?.profile.activeRevision ?? null,
      hasPendingDraft: Boolean(supplierProfileDetail.value?.draftRevision),
    },
  ]));

  const recentActivity = computed(() => ([
    ...materialAuditLogs.value.map((log) => ({ ...log, source: 'material_master' as const })),
    ...supplierAuditLogs.value.map((log) => ({ ...log, source: 'supplier_master' as const })),
  ])
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, 10));

  const governanceFocus = computed(() => ([
    {
      key: 'pending-publish',
      title: '待发布主数据',
      count: issueSummary.value.pendingPublishCount,
      description: '存在 draft 但尚未 publish 的主数据 profile',
      routeName: 'config-master-data-diagnostics',
    },
    {
      key: 'auto-fix',
      title: '可自动修复物料',
      count: issueSummary.value.autoFixCount,
      description: '可直接自动重连的物料异常',
      routeName: 'config-master-data-diagnostics',
    },
    {
      key: 'manual-review',
      title: '需人工处理',
      count: issueSummary.value.manualReviewCount,
      description: '需进入对象工作台继续修复',
      routeName: 'config-master-data-diagnostics',
    },
  ]));

  async function load() {
    loading.value = true;
    loadError.value = null;
    try {
      const [materialDetail, supplierDetail, materialItems, supplierItems, materialCheck, materialLogs, supplierLogs] = await Promise.all([
        api.detailMaterialProfile ? api.detailMaterialProfile() : materialMasterProfileApi.detail(),
        api.detailSupplierProfile ? api.detailSupplierProfile() : supplierMasterProfileApi.detail(),
        api.listMaterials ? api.listMaterials() : materialMasterProfileApi.list(),
        api.listSuppliers ? api.listSuppliers() : supplierMasterProfileApi.list(),
        api.materialReferenceCheck ? api.materialReferenceCheck() : materialMasterProfileApi.referenceCheck(),
        api.materialAuditLogs ? api.materialAuditLogs() : materialMasterProfileApi.auditLogs(),
        api.supplierAuditLogs ? api.supplierAuditLogs() : supplierMasterProfileApi.auditLogs(),
      ]);
      materialProfileDetail.value = materialDetail;
      supplierProfileDetail.value = supplierDetail;
      materials.value = Array.isArray(materialItems) ? materialItems : [];
      suppliers.value = Array.isArray(supplierItems) ? supplierItems : [];
      materialReferenceCheck.value = materialCheck;
      materialAuditLogs.value = Array.isArray(materialLogs) ? materialLogs : [];
      supplierAuditLogs.value = Array.isArray(supplierLogs) ? supplierLogs : [];
    } catch (error: any) {
      console.error(error);
      loadError.value = error?.message || '加载主数据治理看板失败';
      materialProfileDetail.value = null;
      supplierProfileDetail.value = null;
      materials.value = [];
      suppliers.value = [];
      materialReferenceCheck.value = null;
      materialAuditLogs.value = [];
      supplierAuditLogs.value = [];
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    loadError,
    materialProfileDetail,
    supplierProfileDetail,
    issueSummary,
    profileGovernance,
    recentActivity,
    governanceFocus,
    load,
  };
}
