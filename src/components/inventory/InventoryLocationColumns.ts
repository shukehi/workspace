import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryLocation } from '@/types/inventory';
import { Button } from '@/components/ui/button';

export const createInventoryLocationColumns = (actions: {
    onEdit?: (location: InventoryLocation) => void;
} = {}): ColumnDef<InventoryLocation>[] => [
    {
        accessorKey: 'warehouse_name',
        header: '仓库',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('warehouse_name') || '-'),
    },
    {
        accessorKey: 'code',
        header: '库位编码',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('code')),
    },
    {
        accessorKey: 'name',
        header: '库位名称',
        cell: ({ row }) => h('div', { class: 'text-sm' }, row.getValue('name')),
    },
    {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
            const status = String(row.getValue('status') || 'active');
            return h('span', {
                class: `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                }`,
            }, status === 'active' ? '启用' : '停用');
        },
    },
    {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => h('div', {
            class: 'text-xs text-muted-foreground max-w-[220px] truncate',
            title: row.getValue('remark') || '-',
        }, row.getValue('remark') || '-'),
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
            const location = row.original;
            if (!actions.onEdit) {
                return h('div', { class: 'text-muted-foreground text-xs' }, '-');
            }
            return h(Button, {
                variant: 'ghost',
                size: 'sm',
                class: 'h-8 px-2 text-muted-foreground hover:text-blue-700',
                onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                    actions.onEdit?.(location);
                },
            }, () => '编辑');
        },
    },
];
