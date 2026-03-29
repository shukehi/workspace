import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';
import type { Order } from '@/types/order';

export type ProcurementTemplateType =
  | 'packaging'
  | 'cylinder'
  | 'double-door-accessory'
  | 'general-accessory';

export type ProcurementTemplateOption = {
  value: ProcurementTemplateType;
  label: string;
  categories: string[];
};

export const PROCUREMENT_TEMPLATE_OPTIONS: ProcurementTemplateOption[] = [
  { value: 'packaging', label: '包装', categories: ['包装'] },
  { value: 'cylinder', label: '锁芯', categories: ['锁芯'] },
  { value: 'double-door-accessory', label: '双开门配件', categories: ['锁具', '拉手'] },
  { value: 'general-accessory', label: '通用配件', categories: ['锁叉', '五金/配件'] },
];

function isKnownTemplateType(raw: string): raw is ProcurementTemplateType {
  return raw === 'packaging'
    || raw === 'cylinder'
    || raw === 'double-door-accessory'
    || raw === 'general-accessory';
}

export function resolveTemplateTypeFromPrintCategory(category: PrintCategory): ProcurementTemplateType {
  if (category === 'packaging') return 'packaging';
  if (category === 'cylinder') return 'cylinder';
  if (category === 'lockset' || category === 'handle') return 'double-door-accessory';
  return 'general-accessory';
}

export function resolveTemplateTypeFromCategory(categoryRaw: string | undefined): ProcurementTemplateType | undefined {
  if (!String(categoryRaw || '').trim()) return undefined;
  return resolveTemplateTypeFromPrintCategory(normalizePrintCategory(categoryRaw));
}

export function normalizeTemplateType(
  templateTypeRaw: unknown,
  categoryRaw: string | undefined,
) : ProcurementTemplateType | undefined {
  const derivedTemplateType = resolveTemplateTypeFromCategory(categoryRaw);
  if (derivedTemplateType) return derivedTemplateType;
  const raw = String(templateTypeRaw || '').trim().toLowerCase();
  if (isKnownTemplateType(raw)) return raw;
  return undefined;
}

export function resolveSchemaPrintCategory(
  templateTypeRaw: unknown,
  categoryRaw: string | undefined,
): PrintCategory {
  const templateType = normalizeTemplateType(templateTypeRaw, categoryRaw);
  if (templateType === 'packaging') return 'packaging';
  if (templateType === 'cylinder') return 'cylinder';
  if (templateType === 'double-door-accessory') return 'lockset';
  if (templateType === 'general-accessory') return 'lock';
  return normalizePrintCategory(categoryRaw);
}

export function resolveOrderSchemaPrintCategory(order: Partial<Order> | null | undefined): PrintCategory {
  return resolveSchemaPrintCategory(order?.metadata?.template_type, order?.category);
}

export function resolveTemplateCategories(templateType: ProcurementTemplateType): string[] {
  return PROCUREMENT_TEMPLATE_OPTIONS.find((option) => option.value === templateType)?.categories || ['包装'];
}

export function resolvePrimaryCategoryForTemplate(templateType: ProcurementTemplateType): string {
  return resolveTemplateCategories(templateType)[0] || '包装';
}
