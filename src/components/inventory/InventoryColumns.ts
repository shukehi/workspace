import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryItem } from '@/types/inventory';
import { Button } from '@/components/ui/button';
import { Edit2, AlertTriangle } from 'lucide-vue-next';

export const createInventoryColumns = (actions: {
    onEdit: (item: InventoryItem) => void;
}): ColumnDef<InventoryItem>[] => [
    {
        accessorKey: 'model',
        header: '物料型号',
        cell: ({ row }) => h('div', { class: 'font-mono font-bold text-slate-900' }, row.getValue('model'))
    },
    {
        accessorKey: 'category',
        header: '分类',
        cell: ({ row }) => {
            const category = row.getValue<string>('category');
            return h('span', {
                class: 'px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-200 bg-slate-50 text-slate-600'
            }, category);
        }
    },
    {
        accessorKey: 'stock_quantity',
        header: '当前库存',
        cell: ({ row }) => {
            const qty = row.getValue<number>('stock_quantity');
            const min = row.original.min_stock || 0;
            const isLow = qty <= min;
            
            return h('div', { 
                class: `flex items-center gap-2 font-mono font-bold ${isLow ? 'text-rose-600' : 'text-emerald-600'}` 
            }, [
                isLow ? h(AlertTriangle, { class: 'w-4 h-4' }) : null,
                h('span', `${qty} ${row.original.unit}`)
            ]);
        }
    },
    {
        accessorKey: 'supplier',
        header: '常规供应商',
        cell: ({ row }) => h('div', { class: 'text-slate-500' }, row.getValue('supplier'))
    },
    {
        accessorKey: 'last_updated',
        header: '最后更新',
        cell: ({ row }) => {
            const date = new Date(row.getValue<string>('last_updated'));
            return h('div', { class: 'text-slate-400 text-xs' }, date.toLocaleDateString());
        }
    },
    {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
            const item = row.original;
            return h(Button, {
                variant: 'ghost',
                size: 'icon',
                class: 'h-8 w-8 text-slate-400 hover:text-blue-600',
                onClick: (e: MouseEvent) => { e.stopPropagation(); actions.onEdit(item); }
            }, () => h(Edit2, { class: 'h-4 w-4' }));
        }
    }
];
