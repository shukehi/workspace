<script setup lang="ts">
import type { InventoryLocation } from '@/types/inventory';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, Warehouse } from 'lucide-vue-next';

defineProps<{
  warehouseCount: number;
  locationsCount: number;
  activeLocationsCount: number;
  locationSearchQuery: string;
  columns: any[];
  rows: InventoryLocation[];
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:locationSearchQuery', value: string): void;
  (e: 'create-location'): void;
}>();

function asInputValue(value: unknown): string {
  return String(value ?? '');
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">仓库数</CardTitle>
        <Warehouse class="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ warehouseCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">结构预留多仓扩展</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">全部库位</CardTitle>
        <MapPin class="h-4 w-4 text-cyan-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ locationsCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">含停用库位</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">启用库位</CardTitle>
        <MapPin class="h-4 w-4 text-emerald-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ activeLocationsCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">当前可用于入库/出库</p>
      </CardContent>
    </Card>
  </div>

  <Card class="flex-1 min-h-0">
    <CardHeader class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="relative w-full md:w-[320px]">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          :model-value="locationSearchQuery"
          placeholder="搜索仓库、库位编码或备注..."
          class="pl-10"
          @update:model-value="emit('update:locationSearchQuery', asInputValue($event))"
        />
      </div>
      <Button @click="emit('create-location')">
        <MapPin class="w-4 h-4 mr-2" />
        新建库位
      </Button>
    </CardHeader>
    <CardContent class="p-4 pt-0 h-full overflow-auto">
      <DataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        density="compact"
        empty-text="暂无库位配置"
      />
    </CardContent>
  </Card>
</template>
