import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, CheckCircle2, PackageCheck, AlertTriangle, RotateCcw } from 'lucide-vue-next';

type RiskLevel = 'high' | 'medium' | null;

function resolveOrderRisk(order: Order): { level: RiskLevel; reason: string } {
    const items = Array.isArray(order.items) ? order.items : [];
    const hasHighRisk = items.some((item: any) => {
        const supplier = String(item?.supplier || '');
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return supplier.includes('待人工处理')
            || type.includes('未匹配')
            || remark.includes('待人工处理');
    });
    if (hasHighRisk) {
        return { level: 'high', reason: '存在待人工处理明细' };
    }

    const hasMediumRisk = items.some((item: any) => {
        const type = String(item?.type || item?.name || '');
        const remark = String(item?.remark || '');
        return type.includes('待确认')
            || remark.includes('待确认')
            || remark.includes('未识别');
    });
    if (hasMediumRisk) {
        return { level: 'medium', reason: '存在需人工确认明细' };
    }

    return { level: null, reason: '' };
}

export const createColumns = (actions: {
    onEdit: (order: Order) => void;
    onDelete: (order: Order) => void;
    onPreview: (order: Order) => void;
    onStatusUpdate: (order: Order, status: Order['status']) => void;
}): ColumnDef<Order>[] => [
    {
        accessorKey: 'order_no',
        header: '订单号',
        cell: ({ row }) => {
            const order = row.original;
            const { level, reason } = resolveOrderRisk(order);
            const orderNo = row.getValue('order_no');
            if (!level) {
                return h('div', { class: 'font-medium' }, String(orderNo));
            }

            const toneClass = level === 'high'
                ? 'text-red-600'
                : 'text-amber-600';
            const iconClass = level === 'high'
                ? 'h-4 w-4 text-red-600'
                : 'h-4 w-4 text-amber-500';

            return h('div', {
                class: `font-medium inline-flex items-center gap-1.5 ${toneClass}`,
                title: reason
            }, [
                h(AlertTriangle, { class: iconClass }),
                h('span', { class: 'font-semibold' }, String(orderNo))
            ]);
        }
    },
    {
        id: 'customer_name',
        header: '客户名称',
        cell: ({ row }) => {
            const customerName = String(row.original?.metadata?.customer_name || '-').trim() || '-';
            return h('div', { class: 'font-medium' }, customerName);
        }
    },
    {
        accessorKey: 'category',
        header: '类别',
        cell: ({ row }) => {
            const order = row.original;
            const risk = resolveOrderRisk(order);
            const category = row.getValue<string>('category') || '常规';
            const categoryClassMap: Record<string, string> = {
                包装: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                锁芯: 'bg-sky-50 text-sky-700 border-sky-200',
                拉手: 'bg-violet-50 text-violet-700 border-violet-200',
                锁叉: 'bg-amber-50 text-amber-700 border-amber-200',
                配件: 'bg-slate-100 text-slate-700 border-slate-300',
                常规: 'bg-muted/40 text-muted-foreground border-border'
            };
            const riskClass = risk.level === 'high'
                ? 'bg-red-50 text-red-700 border-red-200'
                : risk.level === 'medium'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : '';
            const colorClass = riskClass || categoryClassMap[category] || categoryClassMap.常规;
            return h('span', {
                class: `px-2 py-0.5 rounded text-[10px] font-medium border ${colorClass}`
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
        header: '制单日期',
        cell: ({ row }) => {
            const date = new Date(row.getValue<string>('created_at'));
            return h('div', { class: 'text-muted-foreground text-sm' }, date.toLocaleDateString());
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

                // Quick Action: Restore to Draft
                status === 'cancelled' ? h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100',
                    title: '恢复草稿',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onStatusUpdate(order, 'draft'); }
                }, () => h(RotateCcw, { class: 'h-4 w-4' })) : null,

                // Spacer
                h('div', { class: 'w-[1px] h-4 bg-slate-200 mx-1' }),

                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-blue-600',
                    title: '查看/打印',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onPreview(order); }
                }, () => h(Eye, { class: 'h-4 w-4' })),
                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-amber-600',
                    title: '编辑订单',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onEdit(order); }
                }, () => h(Edit, { class: 'h-4 w-4' })),
                h(Button, {
                    variant: 'ghost',
                    size: 'icon',
                    class: 'h-8 w-8 text-muted-foreground hover:text-rose-600',
                    title: '删除订单',
                    onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onDelete(order); }
                }, () => h(Trash2, { class: 'h-4 w-4' }))
            ]);
        }
    }
];
