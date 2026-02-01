<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { api } from '@/lib/api'
import type { InventoryItem } from '@/types/inventory'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTable from '@/components/data-table/DataTable.vue'
import { Button } from '@/components/ui/button'

const data = ref<InventoryItem[]>([])
const loading = ref(false)

const columns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h('div', { class: 'font-mono text-xs text-neutral-500' }, row.getValue('id')),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => h('span', { class: 'font-mono font-bold uppercase text-xs' }, row.getValue('category')),
  },
  {
    accessorKey: 'model',
    header: 'Model',
    cell: ({ row }) => h('div', { class: 'font-mono' }, row.getValue('model')),
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'stock_quantity',
    header: 'QTY',
    cell: ({ row }) => {
        const qty = row.getValue('stock_quantity') as number;
        const min = row.original.min_stock || 0;
        let colorClass = 'text-black';
        let bgClass = 'bg-transparent';
        
        if (qty === 0) {
            colorClass = 'text-white';
            bgClass = 'bg-red-600';
        } else if (qty < min) {
            colorClass = 'text-red-600';
            bgClass = 'bg-red-50';
        }

        return h('div', { class: `font-mono text-right font-bold px-2 py-0.5 ${colorClass} ${bgClass}` }, qty.toLocaleString())
    },
  },
  {
    accessorKey: 'supplier',
    header: 'Supplier',
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return h('div', { class: 'flex gap-2 justify-end' }, [
          h(Button, {
            variant: 'outline',
            size: 'sm',
            class: 'h-6 text-xs rounded-[0px] border-black hover:bg-black hover:text-white uppercase',
            onClick: () => console.log('Adjust Stock', row.original.id)
          }, () => 'Adj')
      ])
    },
  },
]

async function fetchData() {
    loading.value = true
    try {
        const res = await api.get<InventoryItem[]>('/inventory')
        data.value = res
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
})
</script>

<template>
  <div class="p-8 h-full flex flex-col">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-mono font-bold uppercase">Inventory</h1>
            <p class="font-mono text-sm text-neutral-500 mt-1">Real-time stock levels and valuation.</p>
        </div>
        <div class="flex gap-2">
            <Button variant="outline" class="rounded-[0px] border-black hover:bg-neutral-100 font-mono uppercase">
                Export
            </Button>
            <Button class="rounded-[0px] bg-black text-white hover:bg-neutral-800 font-mono uppercase">
                + Stock In
            </Button>
        </div>
    </div>

    <div class="flex-1 overflow-auto">
        <DataTable :columns="columns" :data="data" />
    </div>
  </div>
</template>
