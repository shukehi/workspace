import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryReceipt } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { normalizeDateString } from '@/features/procurement/docModel';
import { RotateCcw } from 'lucide-vue-next';

export const createInventoryReceiptColumns = (actions: {
    onJumpToOrder?: (receipt: InventoryReceipt) => void;
    onReverse?: (receipt: InventoryReceipt) => void;
    onInspect?: (receipt: InventoryReceipt) => void;
    onViewDetail?: (receipt: InventoryReceipt) => void;
    isReceiptReversible?: (receipt: InventoryReceipt) => boolean;
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
        accessorKey: 'direction',
        header: '方向',
        cell: ({ row }) => {
            const receipt = row.original;
            const isReversal = receipt.direction === 'reversal';
            return h('span', {
                class: `px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    isReversal
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                }`
            }, isReversal ? '撤销' : '入库');
        }
    },
    {
        accessorKey: 'quantity',
        header: '数量',
        cell: ({ row }) => {
            const receipt = row.original;
            const quantity = Number(receipt.quantity || 0);
            const isReversal = quantity < 0 || receipt.direction === 'reversal';
            return h('div', { class: `font-medium ${isReversal ? 'text-rose-600' : 'text-emerald-600'}` }, `${quantity} ${receipt.unit || ''}`.trim());
        }
    },
    {
        accessorKey: 'operator',
        header: '操作人',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue<string>('operator') || '-')
    },
    {
        accessorKey: 'reverse_reason',
        header: '撤销原因',
        cell: ({ row }) => {
            const receipt = row.original;
            return h('div', { class: 'text-muted-foreground text-xs' }, receipt.direction === 'reversal' ? (receipt.reverse_reason || '-') : '-');
        }
    },
    {
        accessorKey: 'reversible_quantity',
        header: '剩余可撤销',
        cell: ({ row }) => {
            const receipt = row.original;
            if (receipt.direction === 'reversal') {
                return h('div', { class: 'text-muted-foreground text-xs' }, '-');
            }
            return h('div', { class: 'text-muted-foreground text-xs' }, `${Number(receipt.reversible_quantity || 0)} ${receipt.unit || ''}`.trim());
        }
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
            const receipt = row.original;
            const reversible = actions.isReceiptReversible?.(receipt);
            const actionNodes = [];

            if (actions.onViewDetail) {
                actionNodes.push(h(Button, {
                    variant: 'ghost',
                    size: 'sm',
                    class: 'h-8 px-2 text-muted-foreground hover:text-blue-700',
                    onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        actions.onViewDetail?.(receipt);
                    }
                }, () => '详情'));
            }

            if (actions.onInspect) {
                actionNodes.push(h(Button, {
                    variant: 'ghost',
                    size: 'sm',
                    class: 'h-8 px-2 text-muted-foreground hover:text-cyan-700',
                    onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        actions.onInspect?.(receipt);
                    }
                }, () => '轨迹'));
            }

            if (reversible && actions.onReverse) {
                actionNodes.push(h(Button, {
                    variant: 'ghost',
                    size: 'sm',
                    class: 'h-8 px-2 text-muted-foreground hover:text-rose-600',
                    onClick: (e: MouseEvent) => {
                        e.stopPropagation();
                        actions.onReverse?.(receipt);
                    }
                }, () => [h(RotateCcw, { class: 'h-4 w-4 mr-1' }), '撤销']));
            }

            if (actionNodes.length === 0) {
                return h('div', { class: 'text-xs text-muted-foreground' }, '-');
            }

            return h('div', { class: 'flex items-center gap-1' }, actionNodes);
        }
    },
    {
        accessorKey: 'remark',
        header: '备注',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground text-xs max-w-[220px] truncate', title: row.getValue<string>('remark') || '-' }, row.getValue<string>('remark') || '-')
    }
];
