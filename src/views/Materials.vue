<script setup lang="ts">
import { ref } from 'vue';
import { useSourceStore } from '@/stores/useSourceStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { rawColumns, cylinderColumns, forkColumns, packagingColumns } from '@/components/materials/MaterialColumns';
import { Card, CardContent } from '@/components/ui/card';

const store = useSourceStore();
const activeTab = ref('raw');
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div>
      <h2 class="text-3xl font-semibold tracking-tight">物料分析</h2>
      <p class="text-muted-foreground mt-1">根据订单计算出的详细物料清单 (BOM)。</p>
    </div>

    <Card v-if="!store.hasOrder" class="flex-1">
      <CardContent class="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>暂无数据。</p>
        <p class="text-sm">请先前往 <b class="text-foreground font-medium">原始订单</b> 页面加载合同。</p>
      </CardContent>
    </Card>

    <div v-else class="flex-1 flex flex-col gap-4 min-h-0">
      <div class="inline-flex gap-1 rounded-md border bg-background p-1 w-fit">
        <button
          v-for="tab in [{k:'raw', l:'原材料'}, {k:'hardware', l:'五金配件'}, {k:'packaging', l:'包装材料'}]"
          :key="tab.k"
          @click="activeTab = tab.k"
          class="px-3 py-1.5 text-sm rounded-sm transition-colors"
          :class="activeTab === tab.k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        >
          {{ tab.l }}
        </button>
      </div>

      <Card class="flex-1 min-h-0">
        <CardContent class="h-full p-4 overflow-auto">
          <div v-if="activeTab === 'raw'" class="h-full">
            <DataTable :columns="rawColumns" :data="store.flatMaterials" density="compact" />
          </div>

          <div v-if="activeTab === 'hardware'" class="space-y-8">
            <div class="space-y-3">
              <h3 class="font-semibold text-base">Cylinders (锁芯)</h3>
              <DataTable :columns="cylinderColumns" :data="store.flatCylinders" density="compact" />
            </div>

            <div class="space-y-3">
              <h3 class="font-semibold text-base">Lock Forks (锁叉)</h3>
              <DataTable :columns="forkColumns" :data="store.flatForks" density="compact" />
            </div>
          </div>

          <div v-if="activeTab === 'packaging'" class="h-full">
            <DataTable :columns="packagingColumns" :data="store.flatPackaging" density="compact" />
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
