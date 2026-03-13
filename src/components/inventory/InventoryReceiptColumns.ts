import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryReceipt } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { normalizeDateString } from '@/features/procurement/docModel';

export const createInventoryReceiptColumns = (actions: {
    onJumpToOrder?: (receipt: InventoryReceipt) => void;
} = {}): ColumnDef<InventoryReceipt>[] => [
    {
        accessorKey: 'receipt_date',
        header: '入库日期',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground text-sm' }, normalizeDateString(row.getValue<string>('receipt_date')) || '-')
    },
    {
        accessorKey: 'order_no',
        header: '订单号',
        cell: ({ row }) => {
            const receipt = row.original;
            if (!actions.onJumpToOrder) {
                return h('div', { class: 'font-medium' }, receipt.order_no);
            }
            return h(Button, {
                variant: 'link',
                class: 'h-auto px-0 font-medium',
                onClick: (e: MouseEvent) => {
                    e.stopPropagation();
                    actions.onJumpToOrder?.(receipt);
                }
            }, () => receipt.order_no);
        }
    },
    {
        accessorKey: 'supplier',
        header: '供应商',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue<string>('supplier') || '-')
    },
    {
        accessorKey: 'item_name',
        header: '物料',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue<string>('item_name') || '-')
    },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => {
            const receipt = row.original;
            return h('div', { class: 'font-medium text-emerald-600' }, `${Number(receipt.quantity || 0)} ${receipt.unit || ''}`.trim());
        }
    },
    {
        accessorKey: 'operator',
        header: '操作人',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue<string>('operator') || '-')
    },
    {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground text-xs max-w-[220px] truncate', title: row.getValue<string>('remark') || '-' }, row.getValue<string>('remark') || '-')
    }
];
