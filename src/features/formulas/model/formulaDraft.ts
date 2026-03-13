import type { MutationError } from '@/services/formulaApi';
import type { FormulaBOMItem, FormulaDetail } from '@/types/formula';
import type { FormulaValidationErrors } from '@/features/formulas/types';

export const LOCAL_DRAFT_KEY_PREFIX = '__local_draft__:';

export function normalizeModelFromMaterialCode(materialId: string, supplier: string): string {
  const normalizedMaterialId = String(materialId || '').trim();
  const normalizedSupplier = String(supplier || '').trim();
  if (!normalizedMaterialId || !normalizedSupplier) return normalizedMaterialId;
  if (normalizedMaterialId.startsWith(normalizedSupplier) && normalizedMaterialId.length > normalizedSupplier.length) {
    return normalizedMaterialId.slice(normalizedSupplier.length);
  }
  return normalizedMaterialId;
}

export function normalizeBomRow(row?: Partial<FormulaBOMItem>): FormulaBOMItem {
  const supplier = String(row?.supplier || '').trim();
  return {
    materialId: normalizeModelFromMaterialCode(String(row?.materialId || '').trim(), supplier),
    position: String(row?.position || '').trim(),
    materialCategory: (row?.materialCategory as FormulaBOMItem['materialCategory']) || '',
    supplier,
    usage: {
      single: Number(row?.usage?.single ?? 0),
      double: Number(row?.usage?.double ?? 0),
      paired: Number(row?.usage?.paired ?? 0),
    },
  };
}

export function normalizeServerErrors(errors: MutationError[] | undefined): FormulaValidationErrors {
  const mapped: FormulaValidationErrors = {};
  for (const error of errors || []) {
    const key = error.field
      .replace(/^bom\[(\d+)\]$/, 'bom.$1')
      .replace(/^bom\[(\d+)\]\./, 'bom.$1.');
    mapped[key] = error.message;
  }
  return mapped;
}

export function isLocalFormulaKey(formulaKey: string): boolean {
  return formulaKey.startsWith(LOCAL_DRAFT_KEY_PREFIX);
}

export function isMeaningfulBomRow(row: FormulaBOMItem): boolean {
  const hasUsage = Number(row.usage.single || 0) > 0
    || Number(row.usage.double || 0) > 0
    || Number(row.usage.paired || 0) > 0;
  return Boolean(row.materialId || row.position || row.materialCategory || row.supplier || hasUsage);
}

export function validateFormulaDraft(
  detail: Pick<FormulaDetail, 'formulaKey' | 'displayName'> | null | undefined,
  bomDraft: FormulaBOMItem[],
  options: { allowEmptyBom?: boolean; allowEmptyFormulaKey?: boolean } = {},
): FormulaValidationErrors {
  const { allowEmptyBom = false, allowEmptyFormulaKey = false } = options;
  const errors: FormulaValidationErrors = {};

  if (!allowEmptyFormulaKey && !detail?.formulaKey) errors.formulaKey = '配方编码不能为空';
  if (!detail?.displayName) errors.displayName = '配方名称不能为空';
  if (!allowEmptyBom && bomDraft.length === 0) errors.bom = 'BOM 不能为空';

  const seen = new Set<string>();
  bomDraft.forEach((row, idx) => {
    if (allowEmptyBom && !isMeaningfulBomRow(row)) return;
    if (!row.materialId) errors[`bom.${idx}.materialId`] = '型号不能为空';
    if (!row.position) errors[`bom.${idx}.position`] = '位置不能为空';
    if (!row.materialCategory) errors[`bom.${idx}.materialCategory`] = '请选择类别';
    if (!row.supplier) errors[`bom.${idx}.supplier`] = '供应商不能为空';
    (['single', 'double', 'paired'] as const).forEach((key) => {
      const val = Number(row.usage[key]);
      if (Number.isNaN(val) || val < 0) {
        errors[`bom.${idx}.usage.${key}`] = '用量必须为非负数';
      }
    });
    const dup = `${row.materialId}::${row.position}`;
    if (seen.has(dup)) errors[`bom.${idx}.dup`] = '存在重复物料+位置';
    seen.add(dup);
  });

  return errors;
}
