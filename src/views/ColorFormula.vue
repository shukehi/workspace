<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { api } from '@/lib/api'
import type { ColorFormula } from '@/types/formula'
import type { ColumnDef } from '@tanstack/vue-table'
import DataTable from '@/components/data-table/DataTable.vue'
import { Button } from '@/components/ui/button'

const data = ref<ColorFormula[]>([])
const loading = ref(false)

const columns: ColumnDef<ColorFormula>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    cell: ({ row }) => h('div', { class: 'font-mono' }, row.getValue('id')),
  },
  {
    accessorKey: 'product_code',
    header: 'Product Code',
    cell: ({ row }) => h('div', { class: 'font-mono font-bold' }, row.getValue('product_code')),
  },
  {
    accessorKey: 'formula_name',
    header: 'Formula Name',
  },
  {
    accessorKey: 'version',
    header: 'Ver',
    cell: ({ row }) => h('div', { class: 'font-mono text-center' }, row.getValue('version')),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return h('div', { 
            class: `font-mono uppercase text-xs border border-black px-1 py-0.5 inline-block ${status === 'active' ? 'bg-black text-white' : 'bg-white text-gray-400'}` 
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
        class: 'h-6 text-xs rounded-[0px] border-black hover:bg-black hover:text-white uppercase',
        onClick: () => console.log('View details', row.original.id)
      }, () => 'View')
    },
  },
]

async function fetchData() {
    loading.value = true
    try {
        const res = await api.get<ColorFormula[]>('/formulas')
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
            <h1 class="text-3xl font-mono font-bold uppercase">Color Formulas</h1>
            <p class="font-mono text-sm text-neutral-500 mt-1">Manage product color recipes and BOMs.</p>
        </div>
        <Button class="rounded-[0px] bg-black text-white hover:bg-neutral-800 font-mono uppercase">
            + New Formula
        </Button>
    </div>

    <div class="flex-1 overflow-auto">
        <DataTable :columns="columns" :data="data" />
    </div>
  </div>
</template>
