import { normalizePrintCategory, type PrintCategory } from '@/features/procurement/docModel';

export type ProcurementTemplateType =
  | 'packaging'
  | 'cylinder'
  | 'double-door-accessory'
  | 'general-accessory';

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
