import { h } from 'vue';
import type { ColumnDef } from '@tanstack/vue-table';
import type { InventoryItem } from '@/types/inventory';
import { AlertTriangle } from 'lucide-vue-next';

function renderLocationSummary(item: InventoryItem) {
    const locations = Array.isArray(item.locations) ? item.locations : [];
    if (locations.length === 0) {
        return h('div', { class: 'text-xs text-muted-foreground' }, '未分配库位');
    }

    const summary = locations
        .filter((entry) => Number(entry.quantity || 0) > 0)
        .slice(0, 2)
        .map((entry) => `${entry.locationName || entry.locationCode}: ${entry.quantity}`)
        .join(' / ');

    return h('div', {
        class: 'text-xs text-muted-foreground max-w-[220px] truncate',
        title: locations.map((entry) => `${entry.warehouseName} / ${entry.locationName || entry.locationCode}: ${entry.quantity}`).join('\n'),
    }, summary || '未分配库位');
}

export const createInventoryColumns = (): ColumnDef<InventoryItem>[] => [
    {
        accessorKey: 'model',
        header: '物料型号',
        cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('model') || row.original.name),
    },
    {
        accessorKey: 'category',
        header: '分类',
        cell: ({ row }) => {
            const category = row.getValue<string>('category');
            return h('span', {
                class: 'px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-border bg-muted/40 text-muted-foreground',
            }, category);
        },
    },
    {
        accessorKey: 'stock_quantity',
        header: '当前库存',
        cell: ({ row }) => {
            const qty = row.getValue<number>('stock_quantity');
            const min = row.original.min_stock || 0;
            const isLow = qty <= min;

            return h('div', {
                class: `flex items-center gap-2 font-medium ${isLow ? 'text-rose-600' : 'text-emerald-600'}`,
            }, [
                isLow ? h(AlertTriangle, { class: 'w-4 h-4' }) : null,
                h('span', `${qty} ${row.original.unit}`),
            ]);
        },
    },
    {
        accessorKey: 'locations',
        header: '库位分布',
        cell: ({ row }) => renderLocationSummary(row.original),
    },
    {
        accessorKey: 'supplier',
        header: '常规供应商',
        cell: ({ row }) => h('div', { class: 'text-muted-foreground' }, row.getValue('supplier') || '-'),
    },
    {
        accessorKey: 'last_updated',
        header: '最后更新',
        cell: ({ row }) => {
            const date = new Date(row.getValue<string>('last_updated'));
            return h('div', { class: 'text-muted-foreground text-xs' }, date.toLocaleDateString());
        },
    },
];
