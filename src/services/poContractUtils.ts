import type { OrderItem } from '@/types/order';

export function createPackagingOrderItem(params: {
    internalName: string;
    externalName: string;
    spec: string;
    mb: string;
    qty: number;
    qtyLeft: number;
    qtyRight: number;
    supplier: string;
}): OrderItem {
    return {
        id: 0,
        material_id: params.spec || params.internalName,
        supplier: params.supplier,
        internal_name: params.internalName,
        external_name: params.externalName,
        name: params.externalName,
        model: params.spec || '-',
        spec: params.spec || '-',
        mb: params.mb || '-',
        orientation: params.mb || '-',
        quantity: params.qty,
        quantity_left: params.qtyLeft,
        quantity_right: params.qtyRight,
        unit: '套',
        remark: `原名: ${params.internalName}`
    };
}

export function createRawMaterialOrderItem(params: {
    supplier: string;
    materialId: string;
    totalUsage: number;
}): OrderItem {
    return {
        id: 0,
        material_id: params.materialId,
        supplier: params.supplier,
        type: params.materialId,
        spec: params.materialId,
        name: params.materialId,
        model: params.materialId,
        quantity: Math.ceil(params.totalUsage),
        unit: 'unit',
        price: 0,
        total: 0,
        remark: `Usage: ${params.totalUsage.toFixed(2)}`
    };
}

export function createCylinderOrderItem(params: {
    supplier: string;
    type: string;
    eccentricity?: string;
    quantity: number;
    remark?: string;
}): OrderItem {
    return {
        id: 0,
        material_id: params.type,
        supplier: params.supplier,
        type: params.type,
        eccentricity: params.eccentricity,
        name: params.type || '锁芯',
        model: params.type || '-',
        spec: params.type || '-',
        quantity: params.quantity,
        unit: '套',
        remark: params.remark || ''
    };
}

export function createLockForkOrderItem(params: {
    supplier: string;
    type: string;
    spec: string;
    quantity: number;
    remark?: string;
}): OrderItem {
    return {
        id: 0,
        material_id: params.type,
        supplier: params.supplier,
        name: params.type || '锁叉',
        model: params.spec || '-',
        type: params.type || '锁叉',
        spec: params.spec || '-',
        quantity: params.quantity,
        unit: '个',
        remark: params.remark || ''
    };
}

export function findMissingCategoryFields(category: string, items: OrderItem[]) {
    const requiredByCategory: Record<string, string[]> = {
        '包装': ['supplier', 'internal_name', 'external_name', 'spec', 'mb', 'quantity'],
        '锁芯': ['supplier', 'type', 'eccentricity', 'quantity'],
        '锁叉': ['supplier', 'type', 'spec', 'quantity']
    };
    const required = requiredByCategory[category];
    if (!required) return [];

    return items
        .map((item, index) => ({
            index,
            missing: required.filter((key) => {
                const value = (item as any)[key];
                return value === undefined || value === null || value === '';
            })
        }))
        .filter((x) => x.missing.length > 0);
}

export function findMissingCommonFields(items: OrderItem[]) {
    const commonRequired = ['material_id', 'name', 'model', 'quantity', 'unit'];
    return items
        .map((item, index) => ({
            index,
            missing: commonRequired.filter((key) => {
                const value = (item as any)[key];
                return value === undefined || value === null || value === '';
            })
        }))
        .filter((x) => x.missing.length > 0);
}

