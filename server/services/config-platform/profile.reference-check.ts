import { Material } from '../../models';
import { getConfigProfileDefinition } from './profile.registry';
import { getConfigProfileDetail } from './profile.service';
import { listSupplierMaster } from './supplier-master';

function normalize(value: unknown): string {
  return String(value || '').trim();
}

type RefEntry = {
  path: string;
  value: string;
};

type RefBag = {
  suppliers: RefEntry[];
  materialCodes: RefEntry[];
};

function createRefBag(): RefBag {
  return { suppliers: [], materialCodes: [] };
}

function addSupplier(refs: RefBag, path: string, value: unknown) {
  const normalized = normalize(value);
  if (normalized) refs.suppliers.push({ path, value: normalized });
}

function addMaterialCode(refs: RefBag, path: string, value: unknown) {
  const normalized = normalize(value);
  if (normalized) refs.materialCodes.push({ path, value: normalized });
}

function extractPackagingRefs(payload: any, refs: RefBag) {
  addSupplier(refs, 'supplierName', payload?.supplierName);
}

function extractCylinderRefs(payload: any, refs: RefBag) {
  const mappings = payload?.mappings && typeof payload.mappings === 'object' ? Object.entries(payload.mappings) : [];
  mappings.forEach(([key, entry]: any) => addSupplier(refs, `mappings.${key}.supplier`, entry?.supplier));

  const rules = Array.isArray(payload?.secondaryAccessoryPackRules) ? payload.secondaryAccessoryPackRules : [];
  rules.forEach((rule: any, index: number) => {
    addSupplier(refs, `secondaryAccessoryPackRules[${index}].supplier`, rule?.supplier);
    const codes = rule?.thicknessMaterialCodes && typeof rule.thicknessMaterialCodes === 'object'
      ? Object.entries(rule.thicknessMaterialCodes)
      : [];
    codes.forEach(([thickness, code]) => addMaterialCode(refs, `secondaryAccessoryPackRules[${index}].thicknessMaterialCodes.${thickness}`, code));
  });
}

function extractLockRefs(payload: any, refs: RefBag) {
  const mappings = payload?.mappings && typeof payload.mappings === 'object' ? Object.entries(payload.mappings) : [];
  mappings.forEach(([key, entry]: any) => addSupplier(refs, `mappings.${key}.supplier`, entry?.supplier));
}

function extractHandleRefs(payload: any, refs: RefBag) {
  addSupplier(refs, 'defaultSupplier', payload?.defaultSupplier);
  addSupplier(refs, 'unmatchedSupplier', payload?.unmatchedSupplier);
  const mappings = payload?.mappings && typeof payload.mappings === 'object' ? Object.entries(payload.mappings) : [];
  mappings.forEach(([key, entry]: any) => {
    addSupplier(refs, `mappings.${key}.supplier`, entry?.supplier);
    addMaterialCode(refs, `mappings.${key}.materialCode`, entry?.materialCode);
  });
}

function extractLockForkRefs(payload: any, refs: RefBag) {
  const suppliers = payload?.suppliers && typeof payload.suppliers === 'object' ? Object.entries(payload.suppliers) : [];
  suppliers.forEach(([key, value]) => addSupplier(refs, `suppliers.${key}`, value));
}

function extractMaterialCatalogRefs(payload: any, refs: RefBag) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  Object.entries(payload as Record<string, unknown>).forEach(([materialCode, entry]) => {
    addMaterialCode(refs, materialCode, materialCode);
    if (entry && typeof entry === 'object') {
      addSupplier(refs, `${materialCode}.supplier`, (entry as Record<string, unknown>).supplier);
    }
  });
}

function extractMaterialMasterRefs(payload: any, refs: RefBag) {
  const items = Array.isArray(payload) ? payload : [];
  items.forEach((item: any, index: number) => {
    addMaterialCode(refs, `items[${index}].code`, item?.code);
    addSupplier(refs, `items[${index}].supplier`, item?.supplier);
  });
}

function extractSupplierMasterRefs(payload: any, refs: RefBag) {
  const items = Array.isArray(payload) ? payload : [];
  items.forEach((item: any, index: number) => {
    addSupplier(refs, `items[${index}].supplierName`, item?.supplierName);
  });
}

function extractFormulaRefs(payload: any, refs: RefBag) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  Object.entries(payload as Record<string, unknown>).forEach(([formulaKey, formula]) => {
    const bom = Array.isArray((formula as any)?.bom) ? (formula as any).bom : [];
    bom.forEach((row: any, index: number) => {
      addSupplier(refs, `${formulaKey}.bom[${index}].supplier`, row?.supplier);
      addMaterialCode(refs, `${formulaKey}.bom[${index}].materialId`, row?.materialId);
    });
  });
}

const EXTRACTORS: Record<string, (payload: unknown, refs: RefBag) => void> = {
  packaging: extractPackagingRefs,
  cylinder: extractCylinderRefs,
  lock: extractLockRefs,
  handle: extractHandleRefs,
  lock_fork: extractLockForkRefs,
  supplier_master: extractSupplierMasterRefs,
  material_master: extractMaterialMasterRefs,
  material_catalog: extractMaterialCatalogRefs,
  formulas: extractFormulaRefs,
};

function extractRefsForProfile(code: string, payload: unknown): RefBag {
  const refs = createRefBag();
  const extractor = EXTRACTORS[code];
  if (extractor) extractor(payload, refs);
  return refs;
}

function uniqueValues(entries: RefEntry[]) {
  return [...new Set(entries.map((entry) => entry.value))].sort();
}

export async function getConfigProfileReferenceCheck(code: string): Promise<{ ok: boolean; status?: number; errors?: Array<{ field: string; code?: string; message: string }>; check?: any }> {
  const definition = getConfigProfileDefinition(code);
  if (!definition) {
    return { ok: false, status: 404, errors: [{ field: 'code', code: 'not-found', message: `Config profile not found: ${code}` }] };
  }

  const detail = await getConfigProfileDetail(code);
  if (!detail.ok || !detail.detail) {
    return { ok: false, status: detail.status, errors: detail.errors };
  }

  const payload = code === 'supplier_master' || code === 'material_master'
    ? (detail.detail.collection?.previewItems || [])
    : (detail.detail.draftPayload || detail.detail.publishedPayload || detail.detail.collection?.previewItems || {});
  const refs = extractRefsForProfile(code, payload);

  const [materials, supplierMaster] = await Promise.all([
    Material.findAll({ attributes: ['code', 'supplier'] }) as Promise<Array<{ code?: string | null; supplier?: string | null }>>,
    listSupplierMaster(),
  ]);

  const materialCodes = new Set(materials.map((item) => normalize(item.code)).filter(Boolean));
  const materialSuppliers = new Set(materials.map((item) => normalize(item.supplier).toLowerCase()).filter(Boolean));
  const supplierMasterNames = new Set(supplierMaster.map((item) => item.normalizedName));

  const materialCodeRefs = refs.materialCodes.map((entry) => ({
    ...entry,
    missingInMaterialMaster: !materialCodes.has(entry.value),
  }));
  const supplierRefs = refs.suppliers.map((entry) => ({
    ...entry,
    missingInMaterialMaster: !materialSuppliers.has(entry.value.toLowerCase()),
    missingInSupplierMaster: !supplierMasterNames.has(entry.value.toLowerCase()),
  }));

  const relationshipHealth: Record<string, unknown> = {};
  if (code === 'material_master') {
    const rows = Array.isArray(payload) ? payload : [];
    const unlinkedMaterialItems = rows
      .map((row: any, index: number) => ({
        path: `items[${index}]`,
        code: normalize(row?.code),
        supplier: normalize(row?.supplier),
        supplier_master_id: row?.supplier_master_id ?? null,
      }))
      .filter((row) => row.supplier && !row.supplier_master_id);
    relationshipHealth.unlinkedMaterialCount = unlinkedMaterialItems.length;
    relationshipHealth.unlinkedMaterialItems = unlinkedMaterialItems;
  }
  if (code === 'supplier_master') {
    const rows = Array.isArray(payload) ? payload : [];
    const inactiveLinkedSuppliers = rows
      .map((row: any, index: number) => ({
        path: `items[${index}]`,
        supplierName: normalize(row?.supplierName),
        linkedMaterialCount: Number(row?.linkedMaterialCount || 0),
        status: normalize(row?.status || 'active'),
      }))
      .filter((row) => row.status === 'inactive' && row.linkedMaterialCount > 0);
    relationshipHealth.inactiveLinkedSupplierCount = inactiveLinkedSuppliers.length;
    relationshipHealth.inactiveLinkedSuppliers = inactiveLinkedSuppliers;
  }

  const missingMaterialCodes = materialCodeRefs.filter((entry) => entry.missingInMaterialMaster).map((entry) => entry.value).filter((value, index, arr) => arr.indexOf(value) === index).sort();
  const suppliersMissingInMaterialMaster = supplierRefs.filter((entry) => entry.missingInMaterialMaster).map((entry) => entry.value).filter((value, index, arr) => arr.indexOf(value) === index).sort();
  const suppliersMissingInSupplierMaster = supplierRefs.filter((entry) => entry.missingInSupplierMaster).map((entry) => entry.value).filter((value, index, arr) => arr.indexOf(value) === index).sort();

  return {
    ok: true,
    check: {
      profileCode: code,
      supplierRefs: uniqueValues(refs.suppliers),
      materialCodeRefs: uniqueValues(refs.materialCodes),
      supplierRefItems: supplierRefs,
      materialCodeRefItems: materialCodeRefs,
      missingMaterialCodes,
      suppliersMissingInMaterialMaster,
      suppliersMissingInSupplierMaster,
      hasIssues: missingMaterialCodes.length > 0
        || suppliersMissingInMaterialMaster.length > 0
        || suppliersMissingInSupplierMaster.length > 0
        || Number((relationshipHealth as any).unlinkedMaterialCount || 0) > 0
        || Number((relationshipHealth as any).inactiveLinkedSupplierCount || 0) > 0,
      ...relationshipHealth,
    },
  };
}
