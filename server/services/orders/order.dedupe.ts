import crypto from 'crypto';
import type { PlainRecord } from '../../shared/types';

export function normalizeDedupeText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

export function normalizeDedupeNumber(value: unknown): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 0;
    return Number(parsed.toFixed(4));
}

export function resolveSourceContractCode(data: PlainRecord | null | undefined, fallback = ''): string {
    return normalizeDedupeText(data?.source_contract_code || data?.metadata?.source_contract_code || fallback);
}

export function normalizeMetadata(data: PlainRecord | null | undefined, fallback: PlainRecord = {}): PlainRecord {
    const next = data && typeof data === 'object' ? { ...data } : { ...fallback };
    const sourceContractCode = resolveSourceContractCode({ source_contract_code: next.source_contract_code, metadata: next });
    if (sourceContractCode) {
        next.source_contract_code = sourceContractCode;
    } else {
        delete next.source_contract_code;
    }
    return next;
}

export function serializeItemFingerprint(item: PlainRecord | null | undefined): PlainRecord {
    return {
        supplier: normalizeDedupeText(item?.supplier),
        internal_name: normalizeDedupeText(item?.internal_name),
        external_name: normalizeDedupeText(item?.external_name),
        type: normalizeDedupeText(item?.type || item?.name),
        spec: normalizeDedupeText(item?.spec || item?.model),
        mb: normalizeDedupeText(item?.mb),
        eccentricity: normalizeDedupeText(item?.eccentricity),
        quantity: normalizeDedupeNumber(item?.quantity),
        quantity_left: normalizeDedupeNumber(item?.quantity_left),
        quantity_right: normalizeDedupeNumber(item?.quantity_right),
        unit: normalizeDedupeText(item?.unit),
        remark: normalizeDedupeText(item?.remark)
    };
}

export function buildOrderDedupePayload(data: PlainRecord | null | undefined): PlainRecord {
    const sourceContractCode = resolveSourceContractCode(data);
    const category = normalizeDedupeText(data?.category);
    const supplier = normalizeDedupeText(data?.supplier);
    const items = Array.isArray(data?.items)
        ? data.items.map(serializeItemFingerprint).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
        : [];

    return {
        sourceContractCode,
        category,
        supplier,
        items,
    };
}

export function buildOrderDedupeKey(data: PlainRecord | null | undefined): string {
    const payload = buildOrderDedupePayload(data);
    if (!payload.sourceContractCode || !payload.category || !payload.supplier || payload.items.length === 0) {
        return '';
    }

    return crypto
        .createHash('sha1')
        .update(JSON.stringify(payload))
        .digest('hex');
}

