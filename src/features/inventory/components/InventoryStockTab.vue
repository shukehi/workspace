<script setup lang="ts">
import type { InventoryItem, InventoryLocation, Warehouse } from '@/types/inventory';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, MapPin, Package, ScrollText, Search, Send } from 'lucide-vue-next';

const props = defineProps<{
  totalItems: number;
  lowStockCount: number;
  activeLocationsCount: number;
  selectedInventoryRowsCount: number;
  reconciliationSummary: {
    mismatchedCount: number;
    totalAbsoluteDiff: number;
  };
  categories: Array<{ id: string; label: string }>;
  activeCategory: string;
  warehouses: Warehouse[];
  availableLocations: InventoryLocation[];
  selectedWarehouseFilter: string;
  selectedLocationFilter: string;
  searchQuery: string;
  lowStockOnly: boolean;
  reconciliationOnly: boolean;
  columns: any[];
  rows: InventoryItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeCategory', value: string): void;
  (e: 'update:selectedWarehouseFilter', value: string): void;
  (e: 'update:selectedLocationFilter', value: string): void;
  (e: 'update:searchQuery', value: string): void;
  (e: 'update:lowStockOnly', value: boolean): void;
  (e: 'update:reconciliationOnly', value: boolean): void;
  (e: 'selection-change', value: InventoryItem[]): void;
  (e: 'export-reconciliation'): void;
  (e: 'open-outbound-dialog'): void;
}>();

function asInputValue(value: unknown): string {
  return String(value ?? '');
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">总物料数</CardTitle>
        <Package class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ totalItems }}</div>
        <p class="text-xs text-muted-foreground mt-1">SKU 统计量</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">低水位预警</CardTitle>
        <AlertCircle class="h-4 w-4 text-rose-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold" :class="{ 'text-rose-600': lowStockCount > 0 }">{{ lowStockCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">低于安全库存(需补货)</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">启用库位</CardTitle>
        <MapPin class="h-4 w-4 text-cyan-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ activeLocationsCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">当前可用库位</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">已选出库物料</CardTitle>
        <Send class="h-4 w-4 text-amber-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ selectedInventoryRowsCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">用于批量登记出库</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">对账异常物料</CardTitle>
        <AlertCircle class="h-4 w-4 text-rose-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold" :class="{ 'text-rose-600': reconciliationSummary.mismatchedCount > 0 }">
          {{ reconciliationSummary.mismatchedCount }}
        </div>
        <p class="text-xs text-muted-foreground mt-1">总库存与库位汇总不一致</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">累计差异量</CardTitle>
        <ScrollText class="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold" :class="{ 'text-amber-600': reconciliationSummary.totalAbsoluteDiff > 0 }">
          {{ reconciliationSummary.totalAbsoluteDiff }}
        </div>
        <p class="text-xs text-muted-foreground mt-1">按绝对值汇总的库存差异</p>
      </CardContent>
    </Card>
  </div>

  <Card>
    <CardContent class="p-4 flex flex-col gap-4">
      <div class="flex flex-wrap gap-1 rounded-md border bg-background p-1 w-fit">
        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="emit('update:activeCategory', cat.id)"
          class="px-3 py-1.5 text-sm rounded-sm transition-colors"
          :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
        >
          {{ cat.label }}
        </button>
      </div>

      <div class="grid gap-3 lg:grid-cols-[1.1fr_1.1fr_1.4fr_auto_auto_auto]">
        <select
          :value="selectedWarehouseFilter"
          class="h-10 rounded-md border bg-background px-3 text-sm"
          @change="emit('update:selectedWarehouseFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部仓库</option>
          <option v-for="warehouse in warehouses" :key="warehouse.id" :value="String(warehouse.id)">
            {{ warehouse.name }}
          </option>
        </select>
        <select
          :value="selectedLocationFilter"
          class="h-10 rounded-md border bg-background px-3 text-sm"
          @change="emit('update:selectedLocationFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部库位</option>
          <option v-for="location in availableLocations" :key="location.id" :value="String(location.id)">
            {{ location.name }} ({{ location.code }})
          </option>
        </select>
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="inventory-search"
            aria-label="搜索物料"
            :model-value="searchQuery"
            placeholder="搜索物料型号、供应商、编码..."
            class="pl-10"
            @update:model-value="emit('update:searchQuery', asInputValue($event))"
          />
        </div>
        <Button variant="outline" @click="emit('update:lowStockOnly', !lowStockOnly)">
          {{ lowStockOnly ? '仅看全部库存' : '仅看低库存' }}
        </Button>
        <Button variant="outline" @click="emit('update:reconciliationOnly', !reconciliationOnly)">
          {{ reconciliationOnly ? '显示全部库存' : '仅看对账异常' }}
        </Button>
        <Button variant="outline" @click="emit('export-reconciliation')">
          导出对账异常
        </Button>
        <Button @click="emit('open-outbound-dialog')">
          <Send class="w-4 h-4 mr-2" />
          出库登记
        </Button>
      </div>
    </CardContent>
  </Card>

  <Card class="flex-1 min-h-0">
    <CardContent class="p-4 h-full overflow-auto">
      <DataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :enable-selection="true"
        :toolbar="false"
        density="compact"
        @selection-change="emit('selection-change', $event)"
      />
    </CardContent>
  </Card>
</template>
