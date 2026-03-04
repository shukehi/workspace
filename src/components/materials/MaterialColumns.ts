
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';

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

// 3. Hardware: Lock Forks
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

// 4. Packaging
export const packagingColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplierName', header: '供应商' },
    { accessorKey: 'spec', header: '规格' },
    {
        accessorKey: 'totalQty',
        header: '总数量',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('totalQty'))
    }
];
