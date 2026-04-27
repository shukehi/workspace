import type { SupplierMasterEntry } from '@/services/mappingConfigApi';
import type { ResolvedMaterialPayload } from '@/services/materialMappingApi';
import type { Order, OrderItem } from '@/types/order';

type ApplyResolutionOptions = {
  externalCode?: string | number | null;
  quantity?: number | null;
};

function normalizeText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function normalizeLookupText(value: unknown): string {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '');
}

function firstNonBlank(...values: unknown[]): string {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return '';
}

function toPositiveNumber(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function resolveOrderQuantity(item: Partial<OrderItem>, fallbackQuantity?: number | null): number {
  const explicitQuantity = Number(fallbackQuantity);
  if (Number.isFinite(explicitQuantity) && explicitQuantity >= 0) return explicitQuantity;
  const hasSplitQuantity = item.quantity_left != null || item.quantity_right != null;
  const left = Number(item.quantity_left ?? 0);
  const right = Number(item.quantity_right ?? 0);
  if (hasSplitQuantity) {
    return (Number.isFinite(left) ? left : 0) + (Number.isFinite(right) ? right : 0);
  }
  const quantity = Number(item.quantity ?? 0);
  return Number.isFinite(quantity) ? quantity : 0;
}

export function resolveMaterialCodeInput(item: Partial<OrderItem>): string {
  return firstNonBlank(item.material_id, item.external_material_code, item.type, item.model, item.name);
}

export function clearMaterialResolutionSnapshot(item: Partial<OrderItem>) {
  item.resolved_material_id = null;
  item.external_material_code = null;
  item.material_resolve_source = null;
  item.transaction_unit = null;
  item.stock_unit = null;
  item.unit_conversion_factor = null;
  item.stock_quantity = null;
}

export function syncMaterialResolutionSnapshotQuantity(item: Partial<OrderItem>, quantity?: number | null): boolean {
  const factor = toPositiveNumber(item.unit_conversion_factor);
  if (factor == null) return false;
  item.stock_quantity = resolveOrderQuantity(item, quantity) * factor;
  return true;
}

export function applyMaterialResolutionToOrderItem(
  item: Partial<OrderItem>,
  resolution: ResolvedMaterialPayload,
  options: ApplyResolutionOptions = {},
) {
  const externalCode = normalizeText(options.externalCode || item.material_id || resolution.supplierCode || resolution.materialCode);
  const transactionUnit = normalizeText(resolution.transactionUnit || item.unit);
  const stockUnit = normalizeText(resolution.stockUnit);
  const factor = toPositiveNumber(resolution.conversionFactor) ?? 1;
  const quantity = resolveOrderQuantity(item, options.quantity);

  item.material_id = externalCode || resolution.materialCode;
  item.resolved_material_id = resolution.materialId;
  item.external_material_code = externalCode || resolution.materialCode;
  item.material_resolve_source = resolution.source;
  item.transaction_unit = transactionUnit || null;
  item.stock_unit = stockUnit || null;
  item.unit_conversion_factor = factor;
  item.stock_quantity = quantity * factor;
  if (transactionUnit) item.unit = transactionUnit;
  if (!normalizeText(item.name)) item.name = resolution.materialName;
  if (!normalizeText(item.model)) item.model = resolution.materialCode;
}

export function findSupplierMasterIdForOrder(
  order: Pick<Order, 'supplier'> | null | undefined,
  suppliers: SupplierMasterEntry[],
): number | null {
  const supplierName = normalizeLookupText(order?.supplier);
  if (!supplierName) return null;

  const match = suppliers.find((supplier) => {
    const id = toPositiveNumber(supplier.id);
    if (!id) return false;
    const candidates = [
      supplier.supplierName,
      supplier.normalizedName,
      ...(supplier.sources || []),
    ];
    return candidates.some((candidate) => normalizeLookupText(candidate) === supplierName);
  });

  return toPositiveNumber(match?.id);
}
