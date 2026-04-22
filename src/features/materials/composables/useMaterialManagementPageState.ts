import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import { api as defaultApi } from '@/lib/api';
import { materialMasterProfileApi, type MaterialMasterReferenceCheck, type WorkflowRevisionMeta } from '@/services/materialMasterProfileApi';
import { supplierMasterProfileApi } from '@/services/supplierMasterProfileApi';

export interface MaterialRecord {
  id: number;
  code: string;
  name: string;
  model: string;
  supplier: string;
  supplier_master_id?: number | null;
  supplierMaster?: {
    id: number;
    supplier_name: string;
    normalized_name: string;
    status: string;
  } | null;
  unit: string;
  price: number;
  category: string;
}

type EditableMaterial = Partial<MaterialRecord>;

interface MaterialManagementApi {
  detail?: () => Promise<any>;
  referenceCheck?: () => Promise<MaterialMasterReferenceCheck | null>;
  auditLogs?: () => Promise<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>;
  revisions?: () => Promise<WorkflowRevisionMeta[]>;
  publish?: (fromRevision: number, changeNote?: string) => Promise<WorkflowRevisionMeta>;
  rollback?: (targetRevision: number, reason?: string) => Promise<{ revision: WorkflowRevisionMeta; activeRevision?: number | null }>;
  listSupplierMasters?: () => Promise<Array<{ id: number; supplierName: string }>>;
  list?: (query?: string) => Promise<MaterialRecord[]>;
  create?: (payload: Partial<MaterialRecord>) => Promise<MaterialRecord>;
  update?: (id: number, payload: Partial<MaterialRecord>) => Promise<MaterialRecord>;
  get?: typeof defaultApi.get;
  post?: typeof defaultApi.post;
  put?: typeof defaultApi.put;
}

interface MaterialManagementOptions {
  api?: MaterialManagementApi;
}

function hasLegacyReadApi(api: MaterialManagementApi): api is MaterialManagementApi & Required<Pick<MaterialManagementApi, 'get'>> {
  return typeof api.get === 'function';
}

function hasLegacyCreateApi(api: MaterialManagementApi): api is MaterialManagementApi & Required<Pick<MaterialManagementApi, 'post'>> {
  return typeof api.post === 'function';
}

function hasLegacyUpdateApi(api: MaterialManagementApi): api is MaterialManagementApi & Required<Pick<MaterialManagementApi, 'put'>> {
  return typeof api.put === 'function';
}

function hasSupplierMasterListApi(api: MaterialManagementApi): api is MaterialManagementApi & Required<Pick<MaterialManagementApi, 'listSupplierMasters'>> {
  return typeof api.listSupplierMasters === 'function';
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
  const api = options.api || materialMasterProfileApi;

  async function listMaterialsByApi(query?: string): Promise<MaterialRecord[]> {
    if (api.list) return await api.list(query);
    if (hasLegacyReadApi(api)) {
      const response = await api.get<MaterialRecord[]>('/materials', {
        params: { q: query || undefined },
      });
      return Array.isArray(response) ? response : [];
    }
    return [];
  }

  async function loadProfileMeta() {
    if (typeof api.detail === 'function') {
      profileDetail.value = await api.detail();
    }
    if (typeof api.referenceCheck === 'function') {
      referenceCheck.value = await api.referenceCheck();
    }
  }

  async function createMaterialByApi(payload: Partial<MaterialRecord>) {
    if (api.create) return await api.create(payload);
    if (hasLegacyCreateApi(api)) return await api.post('/materials', payload);
    return payload as MaterialRecord;
  }

  async function updateMaterialByApi(id: number, payload: Partial<MaterialRecord>) {
    if (api.update) return await api.update(id, payload);
    if (hasLegacyUpdateApi(api)) return await api.put(`/materials/${id}`, payload);
    return payload as MaterialRecord;
  }

  const materials = ref<MaterialRecord[]>([]);
  const loading = ref(false);
  const searchQuery = ref('');
  const profileDetail = ref<any>(null);
  const referenceCheck = ref<MaterialMasterReferenceCheck | null>(null);
  const auditLogs = ref<Array<{ id: number; action: string; operator: string; createdAt: string; meta: Record<string, unknown> }>>([]);
  const revisions = ref<WorkflowRevisionMeta[]>([]);
  const publishing = ref(false);
  const rollingBackRevision = ref<number | null>(null);
  const supplierMasterOptions = ref<Array<{ id: number; supplierName: string }>>([]);
  const isEditDialogOpen = ref(false);
  const editingMaterial = ref<EditableMaterial>(createEmptyDraft());

  const dialogTitle = computed(() => (
    editingMaterial.value.id ? '编辑物料' : '新增物料'
  ));

  const relationshipHealth = computed(() => {
    const allMaterials = materials.value;
    const linkedMaterials = allMaterials.filter((item) => item.supplier_master_id);
    const unlinkedMaterials = allMaterials.filter((item) => !item.supplier_master_id);
    const inactiveLinkedMaterials = allMaterials.filter((item) => item.supplierMaster?.status === 'inactive');
    return {
      totalMaterials: allMaterials.length,
      linkedMaterialCount: linkedMaterials.length,
      unlinkedMaterialCount: referenceCheck.value?.unlinkedMaterialCount ?? unlinkedMaterials.length,
      inactiveSupplierLinkedMaterialCount: inactiveLinkedMaterials.length,
      unlinkedMaterialSamples: (referenceCheck.value?.unlinkedMaterialItems || [])
        .slice(0, 5)
        .map((item) => ({ code: item.code, supplier: item.supplier, path: item.path })),
      inactiveSupplierLinkedMaterials: inactiveLinkedMaterials.slice(0, 5).map((item) => ({
        code: item.code,
        supplier: item.supplier,
        supplierMasterName: item.supplierMaster?.supplier_name || '',
      })),
    };
  });

  const actionableRelationshipGroups = computed(() => {
    const supplierMap = new Map(
      supplierMasterOptions.value.map((item) => [String(item.supplierName || '').trim().toLowerCase(), item]),
    );
    const autoFixCandidates = materials.value
      .filter((item) => !item.supplier_master_id)
      .filter((item) => supplierMap.has(String(item.supplier || '').trim().toLowerCase()))
      .slice(0, 5)
      .map((item) => ({
        ...item,
        suggestedSupplierMaster: supplierMap.get(String(item.supplier || '').trim().toLowerCase()) || null,
      }));
    const manualReviewCandidates = materials.value
      .filter((item) => (
        (!item.supplier_master_id && !supplierMap.has(String(item.supplier || '').trim().toLowerCase()))
        || item.supplierMaster?.status === 'inactive'
      ))
      .slice(0, 5);
    return {
      autoFixCandidates,
      manualReviewCandidates,
    };
  });

  async function fetchMaterials(resetQuery?: string) {
    if (typeof resetQuery === 'string') {
      searchQuery.value = resetQuery;
    }

    loading.value = true;
    try {
      await loadProfileMeta();
      auditLogs.value = api.auditLogs
        ? await api.auditLogs()
        : await materialMasterProfileApi.auditLogs();
      revisions.value = api.revisions
        ? await api.revisions()
        : options.api
          ? []
          : await materialMasterProfileApi.revisions();
      supplierMasterOptions.value = hasSupplierMasterListApi(api)
        ? await api.listSupplierMasters()
        : (await supplierMasterProfileApi.list())
            .filter((item) => item.id)
            .map((item) => ({ id: Number(item.id), supplierName: item.supplierName }));
      const response = await listMaterialsByApi(searchQuery.value.trim() || undefined);
      materials.value = Array.isArray(response) ? response : [];
    } catch (error) {
      console.error(error);
      referenceCheck.value = null;
      auditLogs.value = [];
      supplierMasterOptions.value = [];
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
        await updateMaterialByApi(payload.id, payload);
      } else {
        await createMaterialByApi(payload);
      }

      isEditDialogOpen.value = false;
      await fetchMaterials();
    } catch (error) {
      console.error(error);
    }
  }

  async function autoRelinkMaterial(material: MaterialRecord) {
    if (!material.id) return;
    try {
      await updateMaterialByApi(material.id, {
        supplier: material.supplier,
        supplier_master_id: null,
      });
      await fetchMaterials();
    } catch (error) {
      console.error(error);
    }
  }



  async function publishDraft(changeNote = 'publish material master draft') {
    if (!api.publish || !profileDetail.value?.draftRevision?.revision) return;
    publishing.value = true;
    try {
      await api.publish(Number(profileDetail.value.draftRevision.revision), changeNote);
      await fetchMaterials();
    } catch (error) {
      console.error(error);
    } finally {
      publishing.value = false;
    }
  }

  async function rollbackRevision(targetRevision: number, reason = 'rollback material master revision') {
    if (!api.rollback) return;
    rollingBackRevision.value = targetRevision;
    try {
      await api.rollback(targetRevision, reason);
      await fetchMaterials();
    } catch (error) {
      console.error(error);
    } finally {
      rollingBackRevision.value = null;
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
    profileDetail,
    referenceCheck,
    auditLogs,
    revisions,
    publishing,
    rollingBackRevision,
    supplierMasterOptions,
    relationshipHealth,
    actionableRelationshipGroups,
    isEditDialogOpen,
    editingMaterial,
    dialogTitle,
    fetchMaterials,
    openCreateDialog,
    openEditDialog,
    saveMaterial,
    autoRelinkMaterial,
    publishDraft,
    rollbackRevision,
  };
}
