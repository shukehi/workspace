import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, CheckCircle2, PackageCheck } from 'lucide-vue-next';

export const createColumns = (actions: {
    onEdit: (order: Order) => void;
    onDelete: (order: Order) => void;
    onPreview: (order: Order) => void;
    onStatusUpdate: (order: Order, status: Order['status']) => void;
}): ColumnDef<Order>[] => [
    {
        accessorKey: 'order_no',
        header: '订单号',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('order_no'))
    },
    {
        accessorKey: 'category',
        header: '类别',
        cell: ({ row }) => {
            const category = row.getValue<string>('category') || '常规';
            return h('span', {
                class: 'px-2 py-0.5 rounded text-[10px] font-medium border border-border bg-muted/40 text-muted-foreground'
            }, category);
        }
    },
    {
        accessorKey: 'supplier',
        header: '供应商',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue('supplier'))
    },
    {
        accessorKey: 'created_at',
        header: '下单日期',
        cell: ({ row }) => {
            const date = new Date(row.getValue<string>('created_at'));
            return h('div', { class: 'text-muted-foreground text-sm' }, date.toLocaleDateString());
        }
    },
    {
        accessorKey: 'total_amount',
        header: '金额',
        cell: ({ row }) => {
            const amount = row.getValue<number>('total_amount') || 0;
            return h('div', { class: 'font-medium' }, `¥${amount.toFixed(2)}`);
        }
    },
    {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => {
            const status = row.getValue<'draft' | 'submitted' | 'processing' | 'completed' | 'cancelled'>('status');
            const statusMap = {
                draft: { label: '草稿', class: 'bg-muted/60 text-muted-foreground border-border' },
                submitted: { label: '已提交', class: 'bg-blue-50 text-blue-600 border-blue-200' },
                processing: { label: '处理中', class: 'bg-amber-50 text-amber-600 border-amber-200' },
                completed: { label: '已完成', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                cancelled: { label: '已取消', class: 'bg-rose-50 text-rose-600 border-rose-200' }
            };
            const config = statusMap[status] || statusMap.draft;
            return h('span', {
                class: `px-2 py-0.5 rounded-full text-[10px] font-medium border ${config.class}`
            }, config.label);
        }
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
            const order = row.original;
            const status = order.status;
            
            return h('div', { class: 'flex items-center gap-1' }, [
                // Quick Action: Submit
                status === 'draft' ? h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50',
                    title: '快速提交',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onStatusUpdate(order, 'submitted'); }
                }, () => h(CheckCircle2, { class: 'h-4 w-4' })) : null,

                // Quick Action: Complete
                status === 'processing' || status === 'submitted' ? h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50',
                    title: '结案入库',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onStatusUpdate(order, 'completed'); }
                }, () => h(PackageCheck, { class: 'h-4 w-4' })) : null,

                // Spacer
                h('div', { class: 'w-[1px] h-4 bg-slate-200 mx-1' }),

                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-blue-600',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onPreview(order); }
                }, () => h(Eye, { class: 'h-4 w-4' })),
                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-amber-600',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onEdit(order); }
                }, () => h(Edit, { class: 'h-4 w-4' })),
                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-rose-600',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onDelete(order); }
                }, () => h(Trash2, { class: 'h-4 w-4' }))
            ]);
        }
    }
];
