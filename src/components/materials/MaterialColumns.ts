
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';

function renderRuleNames(value: unknown) {
    const items = Array.isArray(value)
        ? value.map((item) => String(item || '').trim()).filter(Boolean)
        : [];
    return h('div', { class: 'text-xs text-muted-foreground leading-5 whitespace-pre-wrap break-all' }, items.join(', ') || '-');
}

// 1. Raw Materials
export const rawColumns: ColumnDef<any>[] = [
    { accessorKey: 'materialId', header: '物料编码', size: 150 },
    { accessorKey: 'supplierName', header: '供应商', size: 150 },
    {
        accessorKey: 'totalUsage',
        header: '总用量',
        cell: ({ row }) => h('div', { class: 'font-semibold' }, row.getValue<number>('totalUsage').toFixed(2))
    },
    { accessorKey: 'unit', header: '单位' }
];

// 2. Hardware: Cylinders
export const cylinderColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: '供应商' },
    { accessorKey: 'type', header: '型号 / 尺寸' },
    { accessorKey: 'remark', header: '配置说明' },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('quantity'))
    }
];

// 3. Hardware: Locks
export const lockColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: '供应商' },
    { accessorKey: 'type', header: '型号' },
    { accessorKey: 'spec', header: '规格' },
    { accessorKey: 'remark', header: '备注' },
    {
        accessorKey: 'matchedRules',
        header: '命中规则',
        cell: ({ row }) => renderRuleNames(row.getValue('matchedRules'))
    },
    {
        accessorKey: 'winningRules',
        header: '生效规则',
        cell: ({ row }) => renderRuleNames(row.getValue('winningRules'))
    },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('quantity'))
    }
];

// 4. Hardware: Handles
export const handleColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: '供应商' },
    { accessorKey: 'type', header: '型号' },
    { accessorKey: 'spec', header: '规格' },
    { accessorKey: 'remark', header: '备注' },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('quantity'))
    }
];

// 5. Hardware: Accessories
export const accessoryColumns: ColumnDef<any>[] = [
    { accessorKey: 'materialId', header: '物料编码' },
    { accessorKey: 'supplier', header: '供应商' },
    { accessorKey: 'type', header: '名称' },
    { accessorKey: 'spec', header: '规格' },
    { accessorKey: 'remark', header: '备注' },
    {
        accessorKey: 'matchedRules',
        header: '命中规则',
        cell: ({ row }) => renderRuleNames(row.getValue('matchedRules'))
    },
    {
        accessorKey: 'winningRules',
        header: '生效规则',
        cell: ({ row }) => renderRuleNames(row.getValue('winningRules'))
    },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('quantity'))
    }
];

// 6. Hardware: Lock Forks
export const forkColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: '供应商' },
    { accessorKey: 'type', header: '型号', size: 200 },
    { accessorKey: 'spec', header: '规格' },
    { accessorKey: 'remark', header: '备注' },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('quantity'))
    }
];

// 7. Packaging
export const packagingColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplierName', header: '供应商' },
    { accessorKey: 'spec', header: '规格' },
    {
        accessorKey: 'totalQty',
        header: '总数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('totalQty'))
    }
];
