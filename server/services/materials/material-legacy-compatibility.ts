import { logger } from '../../app/logger';

export const MATERIAL_COMPATIBILITY_FIELDS = {
  supplier: 'materials.supplier is retained for legacy display, search, and fallback only; new supplier-specific purchasing data belongs in material_supplier_mappings.',
  aliases: 'materials.aliases is retained for legacy resolver fallback only; new external codes belong in material_code_mappings.',
} as const;

export type LegacyMaterialFallbackReason =
  | 'legacy_resolver_snapshot'
  | 'legacy_material_id_commit_fallback';

type LegacyAuditItem = {
  id?: unknown;
  item_key?: unknown;
  order_item_key?: unknown;
  material_id?: unknown;
  resolved_material_id?: unknown;
  external_material_code?: unknown;
  material_resolve_source?: unknown;
};

type LegacyAuditContext = {
  stage: 'order_create' | 'order_update' | 'stock_in_receipt';
  orderId?: unknown;
  orderNo?: unknown;
  item?: LegacyAuditItem | null;
  materialId?: unknown;
};

export function isLegacyMaterialResolveSource(value: unknown): boolean {
  return value === 'legacy_alias' || value === 'legacy_exact';
}

function hasMappingSnapshot(item: LegacyAuditItem | null | undefined): boolean {
  return item?.resolved_material_id != null
    || item?.external_material_code != null
    || item?.material_resolve_source != null;
}

function hasLegacyMaterialIdFallback(item: LegacyAuditItem): boolean {
  return item.material_id !== undefined
    && item.material_id !== null
    && String(item.material_id).trim().length > 0;
}

export function resolveLegacyMaterialFallbackReason(
  item: LegacyAuditItem | null | undefined,
  options: { includeCommitFallback?: boolean } = {},
): LegacyMaterialFallbackReason | null {
  if (!item) return null;
  if (isLegacyMaterialResolveSource(item.material_resolve_source)) {
    return 'legacy_resolver_snapshot';
  }
  if (
    options.includeCommitFallback
    && !hasMappingSnapshot(item)
    && hasLegacyMaterialIdFallback(item)
  ) {
    return 'legacy_material_id_commit_fallback';
  }
  return null;
}

export function auditLegacyMaterialFallbackUsage(context: LegacyAuditContext): void {
  const reason = resolveLegacyMaterialFallbackReason(context.item, {
    includeCommitFallback: context.stage === 'stock_in_receipt',
  });
  if (!reason) return;

  try {
    logger.warn({
      stage: context.stage,
      reason,
      orderId: context.orderId ?? null,
      orderNo: context.orderNo ?? null,
      orderItemId: context.item?.id ?? null,
      itemKey: context.item?.item_key ?? context.item?.order_item_key ?? null,
      materialInput: context.item?.external_material_code ?? context.item?.material_id ?? null,
      resolvedMaterialId: context.item?.resolved_material_id ?? context.materialId ?? null,
    }, 'Legacy material mapping fallback used during transaction commit');
  } catch {
    // Audit logging must never turn a successfully committed write into a failure.
  }
}
