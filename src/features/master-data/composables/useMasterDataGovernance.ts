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

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
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

  const trendSummary = computed(() => {
    const activity = recentActivity.value;
    const actionCounts = activity.reduce((acc, item) => {
      acc[item.action] = (acc[item.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const autoFixShare = issueSummary.value.materialIssueCount > 0
      ? Math.round((issueSummary.value.autoFixCount / issueSummary.value.materialIssueCount) * 100)
      : 0;
    const manualReviewShare = issueSummary.value.totalIssueCount > 0
      ? Math.round((issueSummary.value.manualReviewCount / issueSummary.value.totalIssueCount) * 100)
      : 0;

    return {
      publishCount: actionCounts.publish || 0,
      rollbackCount: actionCounts.rollback || 0,
      updateCount: actionCounts.update || 0,
      archiveCount: actionCounts.archive || 0,
      autoFixShare,
      manualReviewShare,
      recentActivityCount: activity.length,
    };
  });

  const hotspotObjects = computed(() => {
    const grouped = new Map<string, {
      key: string;
      label: string;
      source: 'material_master' | 'supplier_master';
      count: number;
      latestAt: string | null;
      lastAction: string;
    }>();

    for (const item of recentActivity.value) {
      const label = item.source === 'material_master'
        ? String(item.meta?.code || `material#${item.id}`)
        : String(item.meta?.supplierName || `supplier#${item.id}`);
      const key = `${item.source}:${label}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.count += 1;
        if (toTimestamp(item.createdAt) > toTimestamp(existing.latestAt)) {
          existing.latestAt = item.createdAt;
          existing.lastAction = item.action;
        }
      } else {
        grouped.set(key, {
          key,
          label,
          source: item.source,
          count: 1,
          latestAt: item.createdAt,
          lastAction: item.action,
        });
      }
    }

    return [...grouped.values()]
      .sort((a, b) => (b.count - a.count) || (toTimestamp(b.latestAt) - toTimestamp(a.latestAt)))
      .slice(0, 6);
  });

  const riskSignals = computed(() => {
    const items: Array<{
      key: string;
      title: string;
      count: number;
      severity: 'info' | 'warning' | 'critical';
      description: string;
      routeName: 'config-master-data-diagnostics' | 'material-master' | 'config-suppliers';
    }> = [];

    if (issueSummary.value.pendingPublishCount > 0) {
      items.push({
        key: 'pending-publish',
        title: '存在待发布主数据',
        count: issueSummary.value.pendingPublishCount,
        severity: 'warning',
        description: 'profile 已产生 draft，但仍未 publish。',
        routeName: 'config-master-data-diagnostics',
      });
    }
    if (issueSummary.value.autoFixCount > 0) {
      items.push({
        key: 'auto-fix-backlog',
        title: '自动修复积压',
        count: issueSummary.value.autoFixCount,
        severity: 'info',
        description: '建议优先处理可自动重连项，快速降低异常基数。',
        routeName: 'config-master-data-diagnostics',
      });
    }
    if (issueSummary.value.manualReviewCount > 0) {
      items.push({
        key: 'manual-review',
        title: '人工处理积压',
        count: issueSummary.value.manualReviewCount,
        severity: 'critical',
        description: '仍有需要进入对象工作台逐条修复的问题。',
        routeName: 'config-master-data-diagnostics',
      });
    }

    return items;
  });

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
    trendSummary,
    hotspotObjects,
    riskSignals,
    governanceFocus,
    load,
  };
}
