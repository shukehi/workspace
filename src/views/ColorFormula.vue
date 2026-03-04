<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { configLoader } from '@/services/configLoader';
import type { ColorFormula, LegacyFormula } from '@/types/formula';
import type { ColumnDef } from '@tanstack/vue-table';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const data = ref<ColorFormula[]>([]);
const loading = ref(false);

const columns: ColumnDef<ColorFormula>[] = [
  {
    accessorKey: 'id',
    header: '产品编码 (ID)',
    cell: ({ row }) => h('div', { class: 'font-medium' }, row.getValue('id')),
  },
  {
    accessorKey: 'category',
    header: '分类',
    cell: ({ row }) => h('div', { class: 'px-2 py-0.5 rounded-md bg-muted text-xs inline-block' }, row.getValue('category')),
  },
  {
    accessorKey: 'material_count',
    header: '物料数',
    cell: ({ row }) => h('div', { class: 'font-medium text-center' }, row.getValue('material_count')),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return h('div', {
        class: `text-xs px-2 py-1 rounded-full inline-block font-medium ${status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`
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
        class: 'h-8 text-xs',
        onClick: () => {
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
  <div class="p-6 md:p-8 h-full flex flex-col gap-6 bg-muted/20">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">配方配置</h1>
        <p class="text-sm text-muted-foreground mt-1">管理产品颜色配方数据 (已同步)。</p>
      </div>
      <Button>
        + 新增配方
      </Button>
    </div>

    <Card class="flex-1 min-h-0">
      <CardContent class="h-full overflow-auto p-4">
        <DataTable :columns="columns" :data="data" density="compact" />
      </CardContent>
    </Card>
  </div>
</template>
