import { computed, getCurrentInstance, onMounted, ref } from 'vue';
import { api as defaultApi } from '@/lib/api';
import { materialMasterProfileApi, type MaterialMasterReferenceCheck, type WorkflowRevisionMeta } from '@/services/materialMasterProfileApi';
import { materialMappingApi, type CreateCodeMappingPayload, type CreateSupplierMappingPayload, type CreateUomConversionPayload, type MaterialMappingsPayload, type UpdateCodeMappingPayload, type UpdateSupplierMappingPayload, type UpdateUomConversionPayload } from '@/services/materialMappingApi';
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
  listMaterialMappings?: (materialId: number) => Promise<MaterialMappingsPayload>;
  createSupplierMapping?: (materialId: number, payload: CreateSupplierMappingPayload) => Promise<unknown>;
  updateSupplierMapping?: (materialId: number, mappingId: number, payload: UpdateSupplierMappingPayload) => Promise<unknown>;
  createCodeMapping?: (materialId: number, payload: CreateCodeMappingPayload) => Promise<unknown>;
  updateCodeMapping?: (materialId: number, mappingId: number, payload: UpdateCodeMappingPayload) => Promise<unknown>;
  createUomConversion?: (materialId: number, payload: CreateUomConversionPayload) => Promise<unknown>;
  updateUomConversion?: (materialId: number, conversionId: number, payload: UpdateUomConversionPayload) => Promise<unknown>;
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
  const api: MaterialManagementApi = options.api || materialMasterProfileApi;

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
  const materialMappings = ref<MaterialMappingsPayload | null>(null);
  const materialMappingsMaterialId = ref<number | null>(null);
  const materialMappingsLoading = ref(false);
  const materialMappingError = ref('');
  let materialMappingsRequestId = 0;
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

  async function fetchMaterialMappings(materialId: number | null | undefined) {
    const requestId = ++materialMappingsRequestId;
    if (materialId == null) {
      materialMappings.value = null;
      materialMappingsMaterialId.value = null;
      materialMappingError.value = '';
      materialMappingsLoading.value = false;
      return null;
    }

    materialMappingsLoading.value = true;
    materialMappingError.value = '';
    try {
      const nextMappings = api.listMaterialMappings
        ? await api.listMaterialMappings(materialId)
        : await materialMappingApi.list(materialId);
      if (requestId !== materialMappingsRequestId) return null;
      materialMappings.value = nextMappings;
      materialMappingsMaterialId.value = materialId;
      return nextMappings;
    } catch (error: any) {
      console.error(error);
      if (requestId !== materialMappingsRequestId) return null;
      materialMappings.value = null;
      materialMappingsMaterialId.value = materialId;
      materialMappingError.value = error?.response?.data?.error
        || error?.response?.data?.code
        || error?.message
        || '物料映射加载失败';
      return null;
    } finally {
      if (requestId === materialMappingsRequestId) {
        materialMappingsLoading.value = false;
      }
    }
  }

  async function createSupplierMapping(materialId: number, payload: CreateSupplierMappingPayload) {
    if (api.createSupplierMapping) await api.createSupplierMapping(materialId, payload);
    else await materialMappingApi.createSupplierMapping(materialId, payload);
    await fetchMaterialMappings(materialId);
  }

  async function updateSupplierMapping(materialId: number, mappingId: number, payload: UpdateSupplierMappingPayload) {
    if (api.updateSupplierMapping) await api.updateSupplierMapping(materialId, mappingId, payload);
    else await materialMappingApi.updateSupplierMapping(materialId, mappingId, payload);
    await fetchMaterialMappings(materialId);
  }

  async function createCodeMapping(materialId: number, payload: CreateCodeMappingPayload) {
    if (api.createCodeMapping) await api.createCodeMapping(materialId, payload);
    else await materialMappingApi.createCodeMapping(materialId, payload);
    await fetchMaterialMappings(materialId);
  }

  async function updateCodeMapping(materialId: number, mappingId: number, payload: UpdateCodeMappingPayload) {
    if (api.updateCodeMapping) await api.updateCodeMapping(materialId, mappingId, payload);
    else await materialMappingApi.updateCodeMapping(materialId, mappingId, payload);
    await fetchMaterialMappings(materialId);
  }

  async function createUomConversion(materialId: number, payload: CreateUomConversionPayload) {
    if (api.createUomConversion) await api.createUomConversion(materialId, payload);
    else await materialMappingApi.createUomConversion(materialId, payload);
    await fetchMaterialMappings(materialId);
  }

  async function updateUomConversion(materialId: number, conversionId: number, payload: UpdateUomConversionPayload) {
    if (api.updateUomConversion) await api.updateUomConversion(materialId, conversionId, payload);
    else await materialMappingApi.updateUomConversion(materialId, conversionId, payload);
    await fetchMaterialMappings(materialId);
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
    materialMappings,
    materialMappingsMaterialId,
    materialMappingsLoading,
    materialMappingError,
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
    fetchMaterialMappings,
    createSupplierMapping,
    updateSupplierMapping,
    createCodeMapping,
    updateCodeMapping,
    createUomConversion,
    updateUomConversion,
    publishDraft,
    rollbackRevision,
  };
}
