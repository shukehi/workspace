<script setup lang="ts">
import type { InventoryReceipt } from '@/types/inventory';
import DataTable from '@/components/data-table/DataTable.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Package, ScrollText, Search } from 'lucide-vue-next';

const props = defineProps<{
  summary: {
    count: number;
    uniqueOrders: number;
    totalQuantity: number;
    netQuantity: number;
    latestReceiptDate: string;
  };
  receiptSearchQuery: string;
  receiptOrderFilter: string;
  receiptDirectionFilter: string;
  reverseReasonFilter: string;
  availableReverseReasonOptions: Array<{ value: string; label: string }>;
  columns: any[];
  rows: InventoryReceipt[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  orderNoQuery: string;
}>();

const emit = defineEmits<{
  (e: 'update:receiptSearchQuery', value: string): void;
  (e: 'update:receiptOrderFilter', value: string): void;
  (e: 'update:receiptDirectionFilter', value: string): void;
  (e: 'update:reverseReasonFilter', value: string): void;
  (e: 'update:receiptPageSize', value: number): void;
  (e: 'export'): void;
  (e: 'clear-filters'): void;
  (e: 'prev-page'): void;
  (e: 'next-page'): void;
}>();

function asInputValue(value: unknown): string {
  return String(value ?? '');
}

function onPageSizeChange(event: Event) {
  emit('update:receiptPageSize', Number((event.target as HTMLSelectElement).value || 50));
}
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">记录总数</CardTitle>
        <ScrollText class="h-4 w-4 text-cyan-600" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.count }}</div>
        <p class="text-xs text-muted-foreground mt-1">当前筛选记录数</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">涉及订单数</CardTitle>
        <Package class="h-4 w-4 text-emerald-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.uniqueOrders }}</div>
        <p class="text-xs text-muted-foreground mt-1">覆盖的采购订单</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">累计入库</CardTitle>
        <Package class="h-4 w-4 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.totalQuantity }}</div>
        <p class="text-xs text-muted-foreground mt-1">总计入库数量</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">净入库</CardTitle>
        <Package class="h-4 w-4 text-sky-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.netQuantity }}</div>
        <p class="text-xs text-muted-foreground mt-1">扣除撤销后净值</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle class="text-xs text-muted-foreground">最近入库</CardTitle>
        <ScrollText class="h-4 w-4 text-amber-500" />
      </CardHeader>
      <CardContent>
        <div class="text-2xl font-semibold">{{ summary.latestReceiptDate }}</div>
        <p class="text-xs text-muted-foreground mt-1">按当前筛选结果</p>
      </CardContent>
    </Card>
  </div>

  <Card class="flex-1 min-h-0">
    <CardHeader class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4">
      <div class="flex flex-col md:flex-row gap-2 w-full">
        <div class="relative w-full md:w-64 shrink-0">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="receipt-search"
            aria-label="搜索订单号、物料、操作人"
            :model-value="receiptSearchQuery"
            placeholder="搜索物料、操作人..."
            class="pl-10"
            @update:model-value="emit('update:receiptSearchQuery', asInputValue($event))"
          />
        </div>
        <div class="flex gap-2 flex-wrap flex-1 items-center">
          <Input
            id="receipt-order-filter"
            aria-label="按订单号筛选"
            :model-value="receiptOrderFilter"
            placeholder="按订单号筛选"
            class="w-full md:w-48"
            @update:model-value="emit('update:receiptOrderFilter', asInputValue($event))"
          />
          <select
            id="receipt-direction-filter"
            aria-label="入库方向"
            :value="receiptDirectionFilter"
            class="rounded-md border bg-background px-3 py-2 text-sm"
            @change="emit('update:receiptDirectionFilter', ($event.target as HTMLSelectElement).value)"
          >
            <option value="ALL">全部方向</option>
            <option value="in">仅入库</option>
            <option value="reversal">仅撤销</option>
          </select>
          <select
            id="reverse-reason-filter"
            aria-label="撤销原因"
            :value="reverseReasonFilter"
            class="rounded-md border bg-background px-3 py-2 text-sm"
            @change="emit('update:reverseReasonFilter', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="option in availableReverseReasonOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <Button variant="outline" @click="emit('export')">
            <Download class="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button
            variant="outline"
            :disabled="!receiptOrderFilter && !receiptSearchQuery && receiptDirectionFilter === 'ALL' && reverseReasonFilter === 'ALL'"
            @click="emit('clear-filters')"
          >
            清空筛选
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent class="p-4 pt-0 h-full overflow-auto flex flex-col min-h-[300px]">
      <p v-if="orderNoQuery" class="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-3 py-2 mb-3">
        当前按采购订单 <span class="font-semibold">{{ orderNoQuery }}</span> 定位入库记录
      </p>
      <div class="flex-1 min-h-0">
        <DataTable
          :columns="columns"
          :data="rows"
          :loading="loading"
          density="compact"
          empty-text="暂无采购入库记录"
        />
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <div>
          页码 {{ page }} / {{ totalPages }}，共 {{ total }} 条
        </div>
        <div class="flex items-center gap-2">
          <select id="receipt-page-size" aria-label="每页条数" :value="String(pageSize)" class="rounded-md border bg-background px-2 py-1 text-xs" @change="onPageSizeChange">
            <option :value="20">20 / 页</option>
            <option :value="50">50 / 页</option>
            <option :value="100">100 / 页</option>
          </select>
          <Button variant="outline" size="sm" :disabled="page <= 1 || loading" @click="emit('prev-page')">
            上一页
          </Button>
          <Button variant="outline" size="sm" :disabled="page >= totalPages || loading" @click="emit('next-page')">
            下一页
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
