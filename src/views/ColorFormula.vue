
<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { configLoader } from '@/services/configLoader';
import type { ColorFormula, LegacyFormula } from '@/types/formula';
import type { ColumnDef } from '@tanstack/vue-table';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';

const data = ref<ColorFormula[]>([]);
const loading = ref(false);

const columns: ColumnDef<ColorFormula>[] = [
  {
    accessorKey: 'id',
    header: '产品编码 (ID)',
    cell: ({ row }) => h('div', { class: 'font-mono' }, row.getValue('id')),
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => h('div', { class: 'px-2 py-0.5 rounded-md bg-muted text-xs inline-block' }, row.getValue('category')),
  },
  {
    accessorKey: 'material_count',
    header: '物料数',
    cell: ({ row }) => h('div', { class: 'font-mono font-bold text-center' }, row.getValue('material_count')),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return h('div', { 
            class: `font-mono uppercase text-xs border border-black px-1 py-0.5 inline-block ${status === 'active' ? 'bg-black text-white' : 'bg-white text-gray-400'}` 
        }, status)
    },
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => {
      return h(Button, {
        variant: 'outline',
        size: 'sm',
        class: 'h-6 text-xs rounded-[0px] border-black hover:bg-black hover:text-white uppercase',
        onClick: () => {
            console.log('View BOM Details', row.original.id);
            alert(`BOM for ${row.original.id}: \n` + JSON.stringify(configLoader.getFormulas()[row.original.id]?.bom, null, 2));
        }
      }, () => 'View BOM')
    },
  },
]

async function fetchData() {
    loading.value = true;
    try {
        await configLoader.loadFormulas();
        const rawFormulas = configLoader.getFormulas() as Record<string, LegacyFormula>;
        
        // Transform JSON to Array
        data.value = Object.entries(rawFormulas).map(([key, val]) => ({
            id: key,
            product_code: val.displayName,
            formula_name: val.displayName,
            category: val.category || 'Default',
            material_count: val.bom ? val.bom.length : 0,
            version: '1.0',
            status: 'active',
            created_at: new Date().toISOString()
        }));

    } catch (e) {
        console.error('Failed to load formulas', e);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    fetchData();
})
</script>

<template>
  <div class="p-8 h-full flex flex-col">
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-mono font-bold uppercase">配方配置</h1>
            <p class="font-mono text-sm text-neutral-500 mt-1">管理产品颜色配方数据 (已同步)。</p>
        </div>
        <Button class="rounded-[0px] bg-black text-white hover:bg-neutral-800 font-mono uppercase">
            + 新增配方
        </Button>
    </div>

    <div class="flex-1 overflow-auto border rounded-md">
        <DataTable :columns="columns" :data="data" />
    </div>
  </div>
</template>
