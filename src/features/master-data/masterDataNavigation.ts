export const MATERIAL_DETAIL_TABS = ['basic', 'relationship', 'mappings', 'diagnostics', 'audit'] as const;
export type MaterialDetailTab = typeof MATERIAL_DETAIL_TABS[number];

export const SUPPLIER_DETAIL_TABS = ['basic', 'materials', 'diagnostics', 'audit'] as const;
export type SupplierDetailTab = typeof SUPPLIER_DETAIL_TABS[number];

function normalizeRouteId(value: number | string | null | undefined) {
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

export function normalizeMaterialDetailTab(value: unknown): MaterialDetailTab {
  return typeof value === 'string' && MATERIAL_DETAIL_TABS.includes(value as MaterialDetailTab)
    ? (value as MaterialDetailTab)
    : 'basic';
}

export function normalizeSupplierDetailTab(value: unknown): SupplierDetailTab {
  return typeof value === 'string' && SUPPLIER_DETAIL_TABS.includes(value as SupplierDetailTab)
    ? (value as SupplierDetailTab)
    : 'basic';
}

export function buildMaterialMasterRoute(
  materialId: number | string | null | undefined,
  tab: MaterialDetailTab = 'basic',
) {
  const query: Record<string, string> = { tab };
  const normalizedMaterialId = normalizeRouteId(materialId);
  if (normalizedMaterialId) {
    query.materialId = normalizedMaterialId;
  }
  return {
    name: 'material-master' as const,
    query,
  };
}

export function buildSupplierMasterRoute(
  supplierId: number | string | null | undefined,
  tab: SupplierDetailTab = 'basic',
) {
  const query: Record<string, string> = { tab };
  const normalizedSupplierId = normalizeRouteId(supplierId);
  if (normalizedSupplierId) {
    query.supplierId = normalizedSupplierId;
  }
  return {
    name: 'config-suppliers' as const,
    query,
  };
}
