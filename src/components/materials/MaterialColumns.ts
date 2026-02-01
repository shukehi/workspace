
import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';

// 1. Raw Materials
export const rawColumns: ColumnDef<any>[] = [
    { accessorKey: 'materialId', header: 'Material ID', size: 150 },
    { accessorKey: 'supplierName', header: 'Supplier', size: 150 },
    {
        accessorKey: 'totalUsage',
        header: 'Total Usage',
        cell: ({ row }) => h('div', { class: 'font-mono font-bold' }, row.getValue<number>('totalUsage').toFixed(2))
    },
    { accessorKey: 'unit', header: 'Unit' }
];

// 2. Hardware: Cylinders
export const cylinderColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: 'Supplier' },
    { accessorKey: 'type', header: 'Type / Size' },
    { accessorKey: 'remark', header: 'Configuration' },
    {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: ({ row }) => h('div', { class: 'font-bold' }, row.getValue('quantity'))
    }
];

// 3. Hardware: Lock Forks
export const forkColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplier', header: 'Supplier' },
    { accessorKey: 'type', header: 'Type', size: 200 },
    { accessorKey: 'spec', header: 'Specification' },
    { accessorKey: 'remark', header: 'Remark' },
    {
        accessorKey: 'quantity',
        header: 'Qty',
        cell: ({ row }) => h('div', { class: 'font-bold' }, row.getValue('quantity'))
    }
];

// 4. Packaging
export const packagingColumns: ColumnDef<any>[] = [
    { accessorKey: 'supplierName', header: 'Supplier' },
    { accessorKey: 'spec', header: 'Specification' },
    {
        accessorKey: 'totalQty',
        header: 'Total Qty',
        cell: ({ row }) => h('div', { class: 'font-bold' }, row.getValue('totalQty'))
    }
];
