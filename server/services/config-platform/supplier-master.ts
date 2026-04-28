import { Material, SupplierMaster } from '../../models';
import type { SupplierMasterInstance } from '../../models';
import { buildRuntimeConfigSnapshot } from './profile.snapshot';
import { runtimeNotReady, runtimeReady, type RuntimeReadiness } from './profile.runtime-readiness';

export type SupplierMasterEntry = {
  id?: number | null;
  supplierName: string;
  normalizedName: string;
  status?: string;
  sourceNote?: string;
  sources: string[];
  materialCount: number;
  linkedMaterialCount: number;
  linkedMaterialCodes: string[];
  hasLinkedMaterialsWhileInactive: boolean;
  persisted: boolean;
};

export type SupplierLinkedMaterialEntry = {
  id: number;
  code: string;
  name: string;
  category: string;
  supplier: string;
  supplierMasterId: number | null;
  updatedAt: string | null;
};

type AggregatedSupplierEntry = {
  supplierName: string;
  normalizedName: string;
  sources: string[];
  materialCount: number;
};

export type SupplierMasterListResult = {
  items: SupplierMasterEntry[];
  runtimeReadiness: RuntimeReadiness;
  runtimeNotReady: boolean;
};

function normalizeSupplierName(value: unknown): string {
  return String(value || '').trim();
}

function collectSupplier(map: Map<string, { name: string; sources: Set<string>; materialCount: number }>, name: unknown, source: string, materialCount = 0) {
  const normalized = normalizeSupplierName(name);
  if (!normalized) return;
  const key = normalized.toLowerCase();
  const existing = map.get(key) || { name: normalized, sources: new Set<string>(), materialCount: 0 };
  existing.sources.add(source);
  existing.materialCount += materialCount;
  map.set(key, existing);
}

function collectSuppliersFromObject(map: Map<string, { name: string; sources: Set<string>; materialCount: number }>, payload: unknown, source: string) {
  if (!payload || typeof payload !== 'object') return;
  if (Array.isArray(payload)) {
    payload.forEach((item) => collectSuppliersFromObject(map, item, source));
    return;
  }
  const record = payload as Record<string, unknown>;
  Object.entries(record).forEach(([key, value]) => {
    if (key === 'supplier' || key === 'supplierName' || key === 'defaultSupplier' || key === 'unmatchedSupplier') {
      collectSupplier(map, value, source);
      return;
    }
    if (key === 'suppliers' && value && typeof value === 'object') {
      Object.values(value as Record<string, unknown>).forEach((item) => collectSupplier(map, item, source));
      return;
    }
    collectSuppliersFromObject(map, value, source);
  });
}

async function buildAggregatedSupplierEntries(): Promise<{ entries: AggregatedSupplierEntry[]; runtimeReadiness: RuntimeReadiness }> {
  const map = new Map<string, { name: string; sources: Set<string>; materialCount: number }>();
  let runtimeReadiness: RuntimeReadiness = runtimeReady();

  const materials = await Material.findAll({ attributes: ['supplier'] }) as Array<{ supplier?: string | null }>;
  const counts = new Map<string, number>();
  materials.forEach((material) => {
    const normalized = normalizeSupplierName(material?.supplier);
    if (!normalized) return;
    counts.set(normalized.toLowerCase(), (counts.get(normalized.toLowerCase()) || 0) + 1);
  });
  counts.forEach((count, key) => {
    const sampleName = materials.find((item) => normalizeSupplierName(item?.supplier).toLowerCase() === key)?.supplier || key;
    collectSupplier(map, sampleName, 'material-master', count);
  });

  try {
    const snapshot = await buildRuntimeConfigSnapshot();
    runtimeReadiness = runtimeReady(snapshot.meta?.degradedProfiles);
    collectSuppliersFromObject(map, snapshot.profiles.packaging, 'config:packaging');
    collectSuppliersFromObject(map, snapshot.profiles.cylinder, 'config:cylinder');
    collectSuppliersFromObject(map, snapshot.profiles.lock, 'config:lock');
    collectSuppliersFromObject(map, snapshot.profiles.handle, 'config:handle');
    collectSuppliersFromObject(map, snapshot.profiles.lock_fork, 'config:lock_fork');
    collectSuppliersFromObject(map, snapshot.profiles.material_catalog, 'config:material_catalog');
  } catch (error) {
    runtimeReadiness = runtimeNotReady(error);
    console.warn('[supplier-master] runtime snapshot unavailable while aggregating suppliers', error);
  }

  return {
    entries: [...map.values()].map((entry) => ({
      supplierName: entry.name,
      normalizedName: entry.name.toLowerCase(),
      sources: [...entry.sources].sort(),
      materialCount: entry.materialCount,
    })),
    runtimeReadiness,
  };
}

async function readSupplierRuntimeReadiness(): Promise<RuntimeReadiness> {
  try {
    const snapshot = await buildRuntimeConfigSnapshot();
    return runtimeReady(snapshot.meta?.degradedProfiles);
  } catch (error) {
    return runtimeNotReady(error);
  }
}

async function seedPersistedSupplierMasterIfEmpty() {
  const count = await SupplierMaster.count();
  if (count > 0) return false;

  const { entries } = await buildAggregatedSupplierEntries();
  if (entries.length === 0) return false;

  await SupplierMaster.bulkCreate(
    entries.map((entry) => ({
      supplier_name: entry.supplierName,
      normalized_name: entry.normalizedName,
      status: 'active',
      source_note: entry.sources.join(','),
    })),
    { ignoreDuplicates: true },
  );
  return true;
}

function toPersistedEntry(entry: SupplierMasterInstance, materialCounts: Map<string, number>, linkedMaterials: Map<number, string[]>): SupplierMasterEntry {
  const plain = typeof entry.get === 'function' ? entry.get({ plain: true }) : entry;
  const normalizedName = normalizeSupplierName((plain as any).normalized_name || (plain as any).supplier_name).toLowerCase();
  const rawSources = String((plain as any).source_note || '').split(',').map((item) => item.trim()).filter(Boolean);
  return {
    supplierName: String((plain as any).supplier_name || ''),
    normalizedName,
    id: Number((plain as any).id || 0) || null,
    status: String((plain as any).status || 'active'),
    sourceNote: String((plain as any).source_note || ''),
    sources: rawSources.length > 0 ? rawSources : ['supplier-master'],
    materialCount: materialCounts.get(normalizedName) || 0,
    linkedMaterialCount: linkedMaterials.get(Number((plain as any).id))?.length || 0,
    linkedMaterialCodes: (linkedMaterials.get(Number((plain as any).id)) || []).slice(0, 5),
    hasLinkedMaterialsWhileInactive: String((plain as any).status || 'active') === 'inactive' && (linkedMaterials.get(Number((plain as any).id))?.length || 0) > 0,
    persisted: true,
  };
}


async function buildLinkedMaterialMap() {
  const materials = await Material.findAll({ attributes: ['code', 'supplier_master_id'] }) as Array<{ code?: string | null; supplier_master_id?: number | null }>;
  const linked = new Map<number, string[]>();
  materials.forEach((material) => {
    const supplierMasterId = Number(material.supplier_master_id || 0);
    const code = normalizeSupplierName(material.code);
    if (!Number.isInteger(supplierMasterId) || supplierMasterId <= 0 || !code) return;
    const current = linked.get(supplierMasterId) || [];
    current.push(code);
    linked.set(supplierMasterId, current);
  });
  linked.forEach((codes, id) => {
    linked.set(id, codes.sort());
  });
  return linked;
}
async function buildMaterialSupplierCounts() {
  const materials = await Material.findAll({ attributes: ['supplier'] }) as Array<{ supplier?: string | null }>;
  const counts = new Map<string, number>();
  materials.forEach((material) => {
    const normalized = normalizeSupplierName(material?.supplier).toLowerCase();
    if (!normalized) return;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  });
  return counts;
}

export async function listSupplierMasterWithReadiness(options: { skipSeed?: boolean } = {}): Promise<SupplierMasterListResult> {
  if (!options.skipSeed) {
    await seedPersistedSupplierMasterIfEmpty();
  }
  const [entries, materialCounts, linkedMaterials] = await Promise.all([
    SupplierMaster.findAll({ order: [['supplier_name', 'ASC']] }) as Promise<SupplierMasterInstance[]>,
    buildMaterialSupplierCounts(),
    buildLinkedMaterialMap(),
  ]);

  if (entries.length === 0) {
    const aggregated = await buildAggregatedSupplierEntries();
    const items = aggregated.entries.map((entry) => ({ ...entry, id: null, status: 'active', sourceNote: entry.sources.join(','), linkedMaterialCount: 0, linkedMaterialCodes: [], hasLinkedMaterialsWhileInactive: false, persisted: false }));
    return { items, runtimeReadiness: aggregated.runtimeReadiness, runtimeNotReady: aggregated.runtimeReadiness.runtimeNotReady };
  }

  const runtimeReadiness = await readSupplierRuntimeReadiness();
  return {
    items: entries.map((entry) => toPersistedEntry(entry, materialCounts, linkedMaterials)),
    runtimeReadiness,
    runtimeNotReady: runtimeReadiness.runtimeNotReady,
  };
}

export async function listSupplierMaster(options: { skipSeed?: boolean } = {}): Promise<SupplierMasterEntry[]> {
  return (await listSupplierMasterWithReadiness(options)).items;
}

export async function listSupplierMasterLinkedMaterials(idInput: unknown): Promise<SupplierLinkedMaterialEntry[]> {
  const id = Number(idInput);
  if (!Number.isInteger(id) || id <= 0) return [];

  const materials = await Material.findAll({
    attributes: ['id', 'code', 'name', 'category', 'supplier', 'supplier_master_id', 'updatedAt'],
    where: { supplier_master_id: id },
    order: [['updatedAt', 'DESC'], ['code', 'ASC']],
  }) as Array<{
    id?: number | null;
    code?: string | null;
    name?: string | null;
    category?: string | null;
    supplier?: string | null;
    supplier_master_id?: number | null;
    updatedAt?: string | null;
  }>;

  return materials.map((material) => ({
    id: Number(material.id || 0),
    code: String(material.code || ''),
    name: String(material.name || ''),
    category: String(material.category || ''),
    supplier: String(material.supplier || ''),
    supplierMasterId: Number(material.supplier_master_id || 0) || null,
    updatedAt: material.updatedAt || null,
  }));
}

export async function getSupplierMasterDetail() {
  const seeded = await seedPersistedSupplierMasterIfEmpty();
  const result = await listSupplierMasterWithReadiness({ skipSeed: true });
  const items = result.items;
  return {
    profile: {
      code: 'supplier_master',
      displayName: '供应商主数据',
      domain: 'master-data',
      workflowKind: 'collection',
      status: 'active',
      activeRevision: null,
    },
    seededFromAggregate: seeded,
    total: items.length,
    items,
    runtimeReadiness: result.runtimeReadiness,
    runtimeNotReady: result.runtimeNotReady,
  };
}
