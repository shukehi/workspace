<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useToastStore } from '@/stores/useToastStore';
import DataTable from '@/components/data-table/DataTable.vue';
import { createInventoryColumns } from '@/components/inventory/InventoryColumns';
import { createInventoryReceiptColumns } from '@/components/inventory/InventoryReceiptColumns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCcw, Search, AlertCircle, Package, ScrollText } from 'lucide-vue-next';
import type { InventoryItem, InventoryReceipt } from '@/types/inventory';

const store = useInventoryStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();

const activeCategory = ref('ALL');
const searchQuery = ref('');
const receiptSearchQuery = ref('');
const receiptOrderFilter = ref(String(route.query.orderNo || '').trim());
const debouncedReceiptOrderFilter = refDebounced(receiptOrderFilter, 300);

const categories = [
  { id: 'ALL', label: '全部库存' },
  { id: '锁芯', label: '锁芯' },
  { id: '锁叉', label: '锁叉' },
  { id: '包装', label: '包装材料' }
];

const filteredItems = computed(() => {
  let list = store.sortedItems;

  if (activeCategory.value !== 'ALL') {
    list = list.filter(i => i.category === activeCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    list = list.filter(i =>
      i.model.toLowerCase().includes(query) ||
      i.supplier.toLowerCase().includes(query) ||
      i.name.toLowerCase().includes(query)
    );
  }

  return list;
});

const filteredReceipts = computed(() => {
  const query = receiptSearchQuery.value.trim().toLowerCase();
  const orderNo = receiptOrderFilter.value.trim().toLowerCase();

  return store.sortedReceipts.filter((receipt) => {
    const matchesOrderNo = !orderNo || receipt.order_no.toLowerCase().includes(orderNo);
    if (!matchesOrderNo) return false;
    if (!query) return true;

    return receipt.order_no.toLowerCase().includes(query)
      || String(receipt.supplier || '').toLowerCase().includes(query)
      || String(receipt.item_name || '').toLowerCase().includes(query)
      || String(receipt.operator || '').toLowerCase().includes(query)
      || String(receipt.material_id || '').toLowerCase().includes(query);
  });
});

const handleEdit = (item: InventoryItem) => {
  const newQty = prompt(`修改库存: ${item.model}\n当前数量: ${item.stock_quantity}`, item.stock_quantity.toString());
  if (newQty !== null && !isNaN(parseFloat(newQty))) {
    store.updateStock(item.id, parseFloat(newQty));
  }
};

const columns = createInventoryColumns({ onEdit: handleEdit });
const receiptColumns = createInventoryReceiptColumns({
  onJumpToOrder: (receipt: InventoryReceipt) => {
    router.push({
      name: 'procurement',
      query: {
        orderNo: receipt.order_no
      }
    }).catch(() => undefined);
  }
});

function syncReceiptOrderFilterFromRoute() {
  receiptOrderFilter.value = String(route.query.orderNo || '').trim();
}

function updateInventoryRouteQuery(orderNo: string) {
  const nextQuery = { ...route.query };
  const trimmed = orderNo.trim();
  if (trimmed) nextQuery.orderNo = trimmed;
  else delete nextQuery.orderNo;
  router.replace({ query: nextQuery }).catch(() => undefined);
}

function clearReceiptOrderFilter() {
  receiptOrderFilter.value = '';
  updateInventoryRouteQuery('');
}

async function loadInventoryData() {
  await Promise.all([
    store.fetchInventory(),
    loadReceipts(String(route.query.orderNo || '').trim())
  ]);
}

async function loadReceipts(orderNo = '') {
  try {
    await store.fetchInventoryReceipts(orderNo ? { orderNo } : {});
  } catch {
    toast({
      title: '入库记录加载失败',
      description: '无法获取最新采购入库记录，请稍后重试',
      variant: 'destructive'
    });
  }
}

onMounted(() => {
  loadInventoryData().catch(() => undefined);
});

watch(() => route.query.orderNo, () => {
  syncReceiptOrderFilterFromRoute();
  loadReceipts(String(route.query.orderNo || '').trim()).catch(() => undefined);
});

watch(debouncedReceiptOrderFilter, (value) => {
  updateInventoryRouteQuery(value);
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">库存管理</h2>
        <p class="text-muted-foreground mt-1">监控实时库存、预警低水位物料并维护基础余量。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm" @click="loadInventoryData" :disabled="store.loading || store.receiptsLoading">
          <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading || store.receiptsLoading }" />
          同步库存
        </Button>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">总物料数</CardTitle>
          <Package class="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ store.items.length }}</div>
          <p class="text-xs text-muted-foreground mt-1">SKU 统计量</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">低库存预警</CardTitle>
          <AlertCircle class="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold text-rose-600">{{ store.lowStockItems.length }}</div>
          <p class="text-xs text-muted-foreground mt-1">需立即补货</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">采购入库记录</CardTitle>
          <ScrollText class="h-4 w-4 text-cyan-600" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ store.receipts.length }}</div>
          <p class="text-xs text-muted-foreground mt-1">采购入库流水总数</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardContent class="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex flex-wrap gap-1 rounded-md border bg-background p-1 w-fit">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="activeCategory = cat.id"
            class="px-3 py-1.5 text-sm rounded-sm transition-colors"
            :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            {{ cat.label }}
          </button>
        </div>

        <div class="relative w-full md:w-80">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            placeholder="搜索物料型号、供应商..."
            class="pl-10"
          />
        </div>
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardContent class="p-4 h-full overflow-auto">
        <DataTable
          :columns="columns"
          :data="filteredItems"
          density="compact"
        />
      </CardContent>
    </Card>

    <Card class="flex-1 min-h-0">
      <CardHeader class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>采购入库记录</CardTitle>
          <p class="text-sm text-muted-foreground mt-1">追踪采购订单入库时间、物料和操作人。</p>
        </div>
        <div class="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div class="relative w-full md:w-72">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              v-model="receiptSearchQuery"
              placeholder="搜索订单号、物料、操作人..."
              class="pl-10"
            />
          </div>
          <div class="flex gap-2">
            <Input
              v-model="receiptOrderFilter"
              placeholder="按订单号筛选"
              class="w-full md:w-56"
            />
            <Button variant="outline" @click="clearReceiptOrderFilter" :disabled="!receiptOrderFilter">
              清空
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent class="p-4 h-full overflow-auto">
        <p v-if="route.query.orderNo" class="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-3 py-2 mb-3">
          当前按采购订单 <span class="font-semibold">{{ route.query.orderNo }}</span> 定位入库记录
        </p>
        <DataTable
          :columns="receiptColumns"
          :data="filteredReceipts"
          :loading="store.receiptsLoading"
          density="compact"
          empty-text="暂无采购入库记录"
        />
      </CardContent>
    </Card>
  </div>
</template>
