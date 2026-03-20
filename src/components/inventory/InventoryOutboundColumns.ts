import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryOutbound } from '@/types/inventory';
import { Button } from '@/components/ui/button';

export const createInventoryOutboundColumns = (actions: {
    onViewDetail?: (outbound: InventoryOutbound) => void;
    onReverse?: (outbound: InventoryOutbound) => void;
} = {}): ColumnDef<InventoryOutbound>[] => [
    {
        accessorKey: 'outbound_date',
        header: '出库日期',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground text-sm' }, String(row.getValue('outbound_date') || '').slice(0, 10) || '-'),
    },
    {
        accessorKey: 'outbound_no',
        header: '出库单号',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('outbound_no')),
    },
    {
        accessorKey: 'location_name',
        header: '库位',
        cell: ({ row }) => {
            const outbound = row.original;
            return h('div', { class: 'text-sm' }, `${outbound.warehouse_name || '-'} / ${outbound.location_name || outbound.location_code || '-'}`);
        },
    },
    {
        accessorKey: 'reason',
        header: '用途/原因',
        cell: ({ row }) => h('div', { class: 'text-sm' }, row.getValue('reason') || '-'),
    },
    {
        accessorKey: 'operator',
        header: '操作人',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue('operator') || '-'),
    },
    {
        accessorKey: 'direction',
        header: '方向',
        cell: ({ row }) => {
            const outbound = row.original;
            const isReversal = outbound.direction === 'reversal';
            return h('span', {
                class: `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isReversal
                        ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                }`,
            }, isReversal ? '冲销' : '出库');
        },
    },
    {
        accessorKey: 'items',
        header: '物料数',
        cell: ({ row }) => h('div', { class: 'text-sm text-muted-foreground' }, `${row.original.items.length} 项`),
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
            const outbound = row.original;
            const nodes = [];
            if (actions.onViewDetail) {
                nodes.push(h(Button, {
                    variant: 'ghost',
                    size: 'sm',
                    class: 'h-8 px-2 text-muted-foreground hover:text-blue-700',
                    onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        actions.onViewDetail?.(outbound);
                    },
                }, () => '详情'));
            }
            if (outbound.can_reverse && actions.onReverse) {
                nodes.push(h(Button, {
                    variant: 'ghost',
                    size: 'sm',
                    class: 'h-8 px-2 text-muted-foreground hover:text-amber-700',
                    onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        actions.onReverse?.(outbound);
                    },
                }, () => '冲销'));
            }
            return h('div', { class: 'flex items-center gap-1' }, nodes.length > 0 ? nodes : ['-']);
        },
    },
];
