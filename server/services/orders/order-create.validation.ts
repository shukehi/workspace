import type { OrderCreateInput, OrderItemCreationAttributes, OrderMetadata, OrderUpdateInput } from '../../models/types';

interface ValidationIssue {
    field: string;
    message: string;
}

function toTrimmedString(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeCategory(value: unknown): 'packaging' | 'cylinder' | 'lock' | 'lockset' | 'handle' | 'hardware' {
    const raw = toTrimmedString(value);
    if (raw === '包装' || raw === 'packaging') return 'packaging';
    if (raw === '锁芯' || raw === 'cylinder') return 'cylinder';
    if (raw === '锁叉' || raw === 'lock') return 'lock';
    if (raw === '锁具' || raw === 'lockset') return 'lockset';
    if (raw === '拉手' || raw === 'handle') return 'handle';
    return 'hardware';
}

function supportsSplitQuantityColumns(category: ReturnType<typeof normalizeCategory>): boolean {
    return category === 'packaging' || category === 'lockset' || category === 'handle';
}

function resolveDescriptor(item: Partial<OrderItemCreationAttributes>, category: ReturnType<typeof normalizeCategory>): string {
    if (category === 'packaging') {
        return (
            toTrimmedString(item.name)
            || toTrimmedString(item.internal_name)
            || toTrimmedString(item.external_name)
        );
    }
    return toTrimmedString(item.type) || toTrimmedString(item.name);
}

function resolveSpecLike(item: Partial<OrderItemCreationAttributes>, category: ReturnType<typeof normalizeCategory>): string {
    if (category === 'cylinder') {
        return (
            toTrimmedString(item.eccentricity)
            || toTrimmedString(item.spec)
            || toTrimmedString(item.model)
        );
    }
    return toTrimmedString(item.spec) || toTrimmedString(item.model);
}

function resolveQuantity(item: Partial<OrderItemCreationAttributes>, category: ReturnType<typeof normalizeCategory>): number {
    if (supportsSplitQuantityColumns(category)) {
        return Number(item.quantity_left || 0) + Number(item.quantity_right || 0);
    }
    return Number(item.quantity || 0);
}

function hasMeaningfulInput(item: Partial<OrderItemCreationAttributes>, category: ReturnType<typeof normalizeCategory>): boolean {
    if (resolveDescriptor(item, category)) return true;
    if (resolveSpecLike(item, category)) return true;
    if (toTrimmedString(item.remark)) return true;
    if (toTrimmedString(item.mb)) return true;
    return resolveQuantity(item, category) > 0;
}

function resolveValidatedQuantity(item: Partial<OrderItemCreationAttributes>, category: ReturnType<typeof normalizeCategory>): number {
    const splitQuantity = resolveQuantity(item, category);
    if (splitQuantity > 0) return splitQuantity;
    if (supportsSplitQuantityColumns(category)) {
        return Number(item.quantity || 0);
    }
    return splitQuantity;
}

function isValidIsoDate(value: unknown): boolean {
    if (value instanceof Date) {
        return !Number.isNaN(value.getTime());
    }
    const raw = toTrimmedString(value);
    if (!raw) return false;
    const parsed = new Date(raw);
    return !Number.isNaN(parsed.getTime());
}

export function sanitizeManualCreateItems(
    items: Partial<OrderItemCreationAttributes>[] | undefined,
    categoryRaw: unknown,
): Partial<OrderItemCreationAttributes>[] {
    const category = normalizeCategory(categoryRaw);
    return (items || []).filter((item) => hasMeaningfulInput(item, category));
}

export function validateManualCreateOrder(data: OrderCreateInput): ValidationIssue[] {
    const isManual = data.metadata?.order_source === 'manual';
    if (!isManual) return [];

    const issues: ValidationIssue[] = [];
    const category = normalizeCategory(data.category);
    const items = sanitizeManualCreateItems(data.items as Partial<OrderItemCreationAttributes>[] | undefined, data.category);

    if (!toTrimmedString(data.order_no)) {
        issues.push({ field: 'order_no', message: 'order_no is required' });
    }
    if (!toTrimmedString(data.supplier)) {
        issues.push({ field: 'supplier', message: 'supplier is required' });
    }
    if (!toTrimmedString(data.metadata?.customer_name)) {
        issues.push({ field: 'metadata.customer_name', message: 'customer_name is required for manual orders' });
    }
    if (!isValidIsoDate(data.delivery_date)) {
        issues.push({ field: 'delivery_date', message: 'delivery_date is required for manual orders' });
    }
    if (items.length === 0) {
        issues.push({ field: 'items', message: 'at least one valid item is required for manual orders' });
        return issues;
    }

    items.forEach((item, index) => {
        if (!resolveDescriptor(item, category)) {
            issues.push({ field: `items[${index}].name`, message: 'item descriptor is required' });
        }
        if (!resolveSpecLike(item, category)) {
            issues.push({ field: `items[${index}].spec`, message: 'item spec is required' });
        }
        if (resolveValidatedQuantity(item, category) <= 0) {
            issues.push({ field: `items[${index}].quantity`, message: 'item quantity must be greater than 0' });
        }
    });

    return issues;
}

export function validateLockedManualOrderUpdate(
    data: Pick<OrderUpdateInput, 'delivery_date'>,
    metadata: OrderMetadata | Record<string, unknown> | undefined,
): ValidationIssue[] {
    const isManual = metadata?.order_source === 'manual';
    if (!isManual) return [];

    const issues: ValidationIssue[] = [];
    if (data.delivery_date !== undefined && !isValidIsoDate(data.delivery_date)) {
        issues.push({ field: 'delivery_date', message: 'delivery_date is required for manual orders' });
    }

    return issues;
}
