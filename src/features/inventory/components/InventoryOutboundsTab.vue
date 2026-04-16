<script setup lang="ts">
import type { InventoryLocation, InventoryOutbound, Warehouse } from '@/types/inventory';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Package, Search, Send } from 'lucide-vue-next';

defineProps<{
  summary: {
    totalCount: number;
    totalLocations: number;
    totalIssuedQuantity: number;
    netQuantity: number;
  };
  warehouses: Warehouse[];
  availableLocations: InventoryLocation[];
  outboundNoFilter: string;
  outboundKeyword: string;
  outboundOperatorFilter: string;
  outboundWarehouseFilter: string;
  outboundLocationFilter: string;
  outboundStartDate: string;
  outboundEndDate: string;
  outboundPageSize: number;
  outboundTotalPages: number;
  columns: any[];
  rows: InventoryOutbound[];
  loading: boolean;
  page: number;
  total: number;
}>();

const emit = defineEmits<{
  (e: 'update:outboundNoFilter', value: string): void;
  (e: 'update:outboundKeyword', value: string): void;
  (e: 'update:outboundOperatorFilter', value: string): void;
  (e: 'update:outboundWarehouseFilter', value: string): void;
  (e: 'update:outboundLocationFilter', value: string): void;
  (e: 'update:outboundStartDate', value: string): void;
  (e: 'update:outboundEndDate', value: string): void;
  (e: 'update:outboundPageSize', value: number): void;
  (e: 'clear-filters'): void;
  (e: 'prev-page'): void;
  (e: 'next-page'): void;
}>();

function asInputValue(value: unknown): string {
  return String(value ?? '');
}

function onPageSizeChange(event: Event) {
  emit('update:outboundPageSize', Number((event.target as HTMLSelectElement).value || 50));
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">出库单数</CardTitle>
        <Send class="h-4 w-4 text-amber-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.totalCount }}</div>
        <p class="text-xs text-muted-foreground mt-1">含冲销记录</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">涉及库位</CardTitle>
        <MapPin class="h-4 w-4 text-cyan-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.totalLocations }}</div>
        <p class="text-xs text-muted-foreground mt-1">当前结果覆盖库位</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">累计出库</CardTitle>
        <Package class="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.totalIssuedQuantity }}</div>
        <p class="text-xs text-muted-foreground mt-1">不含冲销回补</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">净出库</CardTitle>
        <Package class="h-4 w-4 text-rose-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.netQuantity }}</div>
        <p class="text-xs text-muted-foreground mt-1">扣除冲销后的净值</p>
      </CardContent>
    </Card>
  </div>

  <Card class="flex-1 min-h-0">
    <CardHeader class="flex flex-col gap-3">
      <div class="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_1fr_1fr]">
        <Input
          :model-value="outboundNoFilter"
          placeholder="按出库单号筛选"
          @update:model-value="emit('update:outboundNoFilter', asInputValue($event))"
        />
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            :model-value="outboundKeyword"
            placeholder="搜索物料、用途、库位..."
            class="pl-10"
            @update:model-value="emit('update:outboundKeyword', asInputValue($event))"
          />
        </div>
        <Input
          :model-value="outboundOperatorFilter"
          placeholder="按操作人筛选"
          @update:model-value="emit('update:outboundOperatorFilter', asInputValue($event))"
        />
        <select
          :value="outboundWarehouseFilter"
          class="h-10 rounded-md border bg-background px-3 text-sm"
          @change="emit('update:outboundWarehouseFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部仓库</option>
          <option v-for="warehouse in warehouses" :key="warehouse.id" :value="String(warehouse.id)">
            {{ warehouse.name }}
          </option>
        </select>
        <select
          :value="outboundLocationFilter"
          class="h-10 rounded-md border bg-background px-3 text-sm"
          @change="emit('update:outboundLocationFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">全部库位</option>
          <option v-for="location in availableLocations" :key="location.id" :value="String(location.id)">
            {{ location.name }} ({{ location.code }})
          </option>
        </select>
      </div>
      <div class="flex flex-wrap gap-2">
        <Input
          :model-value="outboundStartDate"
          type="date"
          class="w-full md:w-[180px]"
          @update:model-value="emit('update:outboundStartDate', asInputValue($event))"
        />
        <Input
          :model-value="outboundEndDate"
          type="date"
          class="w-full md:w-[180px]"
          @update:model-value="emit('update:outboundEndDate', asInputValue($event))"
        />
        <Button variant="outline" @click="emit('clear-filters')">
          清空筛选
        </Button>
      </div>
    </CardHeader>
    <CardContent class="p-4 pt-0 h-full overflow-auto flex flex-col min-h-[300px]">
      <div class="flex-1 min-h-0">
        <DataTable
          :columns="columns"
          :data="rows"
          :loading="loading"
          density="compact"
          empty-text="暂无正式出库记录"
        />
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <div>
          页码 {{ page }} / {{ outboundTotalPages }}，共 {{ total }} 条
        </div>
        <div class="flex items-center gap-2">
          <select :value="String(outboundPageSize)" class="rounded-md border bg-background px-2 py-1 text-xs" @change="onPageSizeChange">
            <option :value="20">20 / 页</option>
            <option :value="50">50 / 页</option>
            <option :value="100">100 / 页</option>
          </select>
          <Button variant="outline" size="sm" :disabled="page <= 1 || loading" @click="emit('prev-page')">
            上一页
          </Button>
          <Button variant="outline" size="sm" :disabled="page >= outboundTotalPages || loading" @click="emit('next-page')">
            下一页
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
