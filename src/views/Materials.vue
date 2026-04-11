<script setup lang="ts">
import { useSourceStore } from '@/stores/useSourceStore';
import DataTable from '@/components/data-table/DataTable.vue';
import {
  rawColumns,
  cylinderColumns,
  lockColumns,
  handleColumns,
  accessoryColumns,
  forkColumns,
  packagingColumns,
} from '@/components/materials/MaterialColumns';
import { Card, CardContent } from '@/components/ui/card';
import { useMaterialsPageState } from '@/features/materials/composables/useMaterialsPageState';

const store = useSourceStore();
const { activeTab, tabs, setActiveTab } = useMaterialsPageState();
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
          v-for="tab in tabs"
          :key="tab.key"
          @click="setActiveTab(tab.key)"
          class="px-3 py-1.5 text-sm rounded-sm transition-colors"
          :class="activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        >
          {{ tab.label }}
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
              <h3 class="font-semibold text-base">Locks (锁具)</h3>
              <DataTable :columns="lockColumns" :data="store.flatLocks" density="compact" />
            </div>

            <div class="space-y-3">
              <h3 class="font-semibold text-base">Handles (拉手)</h3>
              <DataTable :columns="handleColumns" :data="store.flatHandles" density="compact" />
            </div>

            <div class="space-y-3">
              <h3 class="font-semibold text-base">Accessories (五金配件)</h3>
              <DataTable :columns="accessoryColumns" :data="store.flatAccessories" density="compact" />
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
