type AuditCategory = 'packaging' | 'cylinder' | 'lockset' | 'handle' | 'lock' | 'hardware' | 'color';

type AnyItem = Record<string, unknown>;

export interface AggregatedAuditItem {
    signature: string;
    label: string;
    quantity: number;
    quantityLeft: number;
    quantityRight: number;
}

export interface AuditMismatchLine {
    signature: string;
    label: string;
    actualQuantity: number;
    expectedQuantity: number;
    actualQuantityLeft: number;
    expectedQuantityLeft: number;
    actualQuantityRight: number;
    expectedQuantityRight: number;
}

function normalizeText(value: unknown): string {
    if (value === undefined || value === null) return '';
    return String(value).trim();
}

function normalizeNumber(value: unknown): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Number(numeric.toFixed(4));
}

export function normalizeAuditCategory(raw: unknown): AuditCategory {
    const value = normalizeText(raw).toLowerCase();
    if (value === 'cylinder' || value.includes('锁芯')) return 'cylinder';
    if (value === 'lockset' || value.includes('锁具')) return 'lockset';
    if (value === 'handle' || value.includes('拉手')) return 'handle';
    if (value === 'lock' || value.includes('锁叉')) return 'lock';
    if (value === 'hardware' || value.includes('五金') || value.includes('配件')) return 'hardware';
    if (value.includes('颜色')) return 'color';
    return 'packaging';
}

export function supportsSplitQuantityAudit(categoryRaw: unknown): boolean {
    const category = normalizeAuditCategory(categoryRaw);
    return category === 'packaging' || category === 'lockset' || category === 'handle';
}

function buildPackagingSignature(item: AnyItem) {
    return [
        normalizeText(item.internal_name || item.internalName),
        normalizeText(item.spec || item.model),
        normalizeText(item.mb || item.orientation),
    ].join('|');
}

function buildCylinderSignature(item: AnyItem) {
    return [
        normalizeText(item.material_id),
        normalizeText(item.type || item.name),
        normalizeText(item.eccentricity),
        normalizeText(item.remark),
    ].join('|');
}

function buildLocksetSignature(item: AnyItem) {
    return [
        normalizeText(item.material_id),
        normalizeText(item.type || item.name),
        normalizeText(item.spec || item.model),
        normalizeText(item.remark),
    ].join('|');
}

function buildLockSignature(item: AnyItem) {
    return [
        normalizeText(item.material_id),
        normalizeText(item.type || item.name),
        normalizeText(item.spec || item.model),
        normalizeText(item.remark),
    ].join('|');
}

function buildHardwareSignature(item: AnyItem) {
    return [
        normalizeText(item.material_id),
        normalizeText(item.type || item.name),
        normalizeText(item.spec || item.model),
        normalizeText(item.remark),
    ].join('|');
}

function buildColorSignature(item: AnyItem) {
    return normalizeText(item.material_id || item.type || item.name || item.model);
}

export function buildAuditItemSignature(categoryRaw: unknown, item: AnyItem): string {
    const category = normalizeAuditCategory(categoryRaw);
    if (category === 'packaging') return buildPackagingSignature(item);
    if (category === 'cylinder') return buildCylinderSignature(item);
    if (category === 'lockset' || category === 'handle') return buildLocksetSignature(item);
    if (category === 'lock') return buildLockSignature(item);
    if (category === 'hardware') return buildHardwareSignature(item);
    return buildColorSignature(item);
}

function buildAuditItemLabel(categoryRaw: unknown, item: AnyItem): string {
    const category = normalizeAuditCategory(categoryRaw);
    if (category === 'packaging') {
        const internalName = normalizeText(item.internal_name || item.internalName) || '未匹配';
        const spec = normalizeText(item.spec || item.model) || '-';
        const mb = normalizeText(item.mb || item.orientation) || '-';
        return `${internalName} | ${spec} | ${mb}`;
    }
    if (category === 'cylinder') {
        return `${normalizeText(item.type || item.name) || '-'} | ${normalizeText(item.eccentricity) || '-'}`;
    }
    if (category === 'color') {
        return normalizeText(item.material_id || item.type || item.name || item.model) || '-';
    }
    return `${normalizeText(item.type || item.name) || '-'} | ${normalizeText(item.spec || item.model) || '-'}`;
}

export function aggregateAuditItems(categoryRaw: unknown, items: AnyItem[]): AggregatedAuditItem[] {
    const bucket = new Map<string, AggregatedAuditItem>();
    const split = supportsSplitQuantityAudit(categoryRaw);

    for (const item of items || []) {
        const signature = buildAuditItemSignature(categoryRaw, item);
        const label = buildAuditItemLabel(categoryRaw, item);
        const quantity = normalizeNumber(item.quantity);
        const quantityLeft = split ? normalizeNumber(item.quantity_left) : 0;
        const quantityRight = split ? normalizeNumber(item.quantity_right) : 0;

        if (!bucket.has(signature)) {
            bucket.set(signature, {
                signature,
                label,
                quantity: 0,
                quantityLeft: 0,
                quantityRight: 0,
            });
        }

        const target = bucket.get(signature)!;
        target.quantity += quantity;
        target.quantityLeft += quantityLeft;
        target.quantityRight += quantityRight;
    }

    return Array.from(bucket.values()).sort((a, b) => a.signature.localeCompare(b.signature));
}

export function diffAuditItems(
    categoryRaw: unknown,
    actualItems: AnyItem[],
    expectedItems: AnyItem[],
): AuditMismatchLine[] {
    const actual = new Map(aggregateAuditItems(categoryRaw, actualItems).map((item) => [item.signature, item]));
    const expected = new Map(aggregateAuditItems(categoryRaw, expectedItems).map((item) => [item.signature, item]));
    const signatures = Array.from(new Set([...actual.keys(), ...expected.keys()])).sort();
    const lines: AuditMismatchLine[] = [];

    for (const signature of signatures) {
        const actualItem = actual.get(signature);
        const expectedItem = expected.get(signature);
        const actualQuantity = actualItem?.quantity ?? 0;
        const expectedQuantity = expectedItem?.quantity ?? 0;
        const actualQuantityLeft = actualItem?.quantityLeft ?? 0;
        const expectedQuantityLeft = expectedItem?.quantityLeft ?? 0;
        const actualQuantityRight = actualItem?.quantityRight ?? 0;
        const expectedQuantityRight = expectedItem?.quantityRight ?? 0;

        if (
            actualQuantity === expectedQuantity
            && actualQuantityLeft === expectedQuantityLeft
            && actualQuantityRight === expectedQuantityRight
        ) {
            continue;
        }

        lines.push({
            signature,
            label: actualItem?.label || expectedItem?.label || signature,
            actualQuantity,
            expectedQuantity,
            actualQuantityLeft,
            expectedQuantityLeft,
            actualQuantityRight,
            expectedQuantityRight,
        });
    }

    return lines;
}

export function scoreAuditMismatch(lines: AuditMismatchLine[]): number {
    return lines.reduce((sum, line) => (
        sum
        + Math.abs(line.actualQuantity - line.expectedQuantity)
        + Math.abs(line.actualQuantityLeft - line.expectedQuantityLeft)
        + Math.abs(line.actualQuantityRight - line.expectedQuantityRight)
    ), 0);
}
