import type { OrderMetadata } from '../../models/types';

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

function normalizeCategory(categoryRaw: unknown): 'packaging' | 'cylinder' | 'lock' | 'lockset' | 'handle' | 'hardware' | null {
    const raw = String(categoryRaw || '').trim().toLowerCase();
    if (!raw) return null;
    if (raw === '包装' || raw === 'packaging') return 'packaging';
    if (raw === '锁芯' || raw === 'cylinder') return 'cylinder';
    if (raw === '锁具' || raw === 'lockset') return 'lockset';
    if (raw === '拉手' || raw === 'handle') return 'handle';
    if (raw === '锁叉' || raw === 'lock') return 'lock';
    return 'hardware';
}

export function resolveTemplateTypeFromCategory(categoryRaw: unknown): ProcurementTemplateType | undefined {
    const category = normalizeCategory(categoryRaw);
    if (!category) return undefined;
    if (category === 'packaging') return 'packaging';
    if (category === 'cylinder') return 'cylinder';
    if (category === 'lockset' || category === 'handle') return 'double-door-accessory';
    return 'general-accessory';
}

export function normalizeTemplateType(
    templateTypeRaw: unknown,
    categoryRaw: unknown,
) : ProcurementTemplateType | undefined {
    const raw = String(templateTypeRaw || '').trim().toLowerCase();
    if (isKnownTemplateType(raw)) return raw;
    return resolveTemplateTypeFromCategory(categoryRaw);
}

export function deriveTemplateTypeFromCategory(categoryRaw: unknown): ProcurementTemplateType | undefined {
    return resolveTemplateTypeFromCategory(categoryRaw);
}

export function ensureOrderTemplateType<T extends OrderMetadata | Record<string, unknown>>(
    metadata: T | null | undefined,
    categoryRaw: unknown,
): T {
    const next = metadata && typeof metadata === 'object'
        ? { ...metadata }
        : {};
    const derivedTemplateType = deriveTemplateTypeFromCategory(categoryRaw);
    const templateType = derivedTemplateType || normalizeTemplateType(next.template_type, categoryRaw);
    if (!templateType) {
        delete (next as Record<string, unknown>).template_type;
        return next as T;
    }
    return {
        ...next,
        template_type: templateType,
    } as T;
}
