<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { api } from '@/lib/api'
import type { Order } from '@/types/order'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTable from '@/components/data-table/DataTable.vue'
import { Button } from '@/components/ui/button'

const data = ref<Order[]>([])
const loading = ref(false)

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: 'order_no',
    header: 'PO Number',
    cell: ({ row }) => h('div', { class: 'font-mono font-bold' }, row.getValue('order_no')),
  },
  {
    accessorKey: 'supplier',
    header: 'Supplier',
  },
  {
    accessorKey: 'created_at',
    header: 'Date',
    cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        return h('div', { class: 'font-mono text-xs' }, date.toLocaleDateString())
    }
  },
  {
    accessorKey: 'total_amount',
    header: 'Total',
     cell: ({ row }) => {
        const amount = parseFloat(row.getValue('total_amount'));
        return h('div', { class: 'font-mono text-right' }, `$${amount.toLocaleString()}`)
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        let style = 'bg-white text-black border-black'; // default
        
        switch(status) {
            case 'draft': style = 'bg-neutral-100 text-neutral-500 border-neutral-300 dashed'; break; // Draft: Grey
            case 'completed': style = 'bg-black text-white border-black'; break; // Completed: Black
            case 'processing': style = 'bg-white text-black border-black border-dotted'; break; // Processing: Dotted
            case 'submitted': style = 'bg-white text-black border-black'; break; 
        }

        return h('div', { 
            class: `font-mono uppercase text-[10px] px-2 py-0.5 border inline-block ${style}` 
        }, status)
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return h(Button, {
        variant: 'outline',
        size: 'sm',
        class: 'h-6 text-xs',
        onClick: () => console.log('Edit Order', row.original.id)
      }, () => 'Edit')
    },
  },
]

async function fetchData() {
    loading.value = true
    try {
        const res = await api.get<Order[]>('/orders')
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
            <h1 class="text-3xl font-mono font-bold uppercase">Procurement</h1>
            <p class="font-mono text-sm text-neutral-500 mt-1">Manage purchase orders and suppliers.</p>
        </div>
        <Button>
            + New Order
        </Button>
    </div>

    <div class="flex-1 overflow-auto">
        <DataTable :columns="columns" :data="data" />
    </div>
  </div>
</template>
