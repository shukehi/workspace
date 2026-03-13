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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { RefreshCcw, Search, AlertCircle, Package, ScrollText, Download } from 'lucide-vue-next';
import type { InventoryItem, InventoryReceipt } from '@/types/inventory';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const PROCUREMENT_REFRESH_SIGNAL_KEY = 'procurement-orders-refresh-signal';

const store = useInventoryStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();

const activeCategory = ref('ALL');
const searchQuery = ref('');
const receiptSearchQuery = ref('');
const receiptOrderFilter = ref(String(route.query.orderNo || '').trim());
const debouncedReceiptOrderFilter = refDebounced(receiptOrderFilter, 300);
const reverseDialogOpen = ref(false);
const reverseReceiptTarget = ref<InventoryReceipt | null>(null);
const reverseReason = ref('entry_error');
const reverseRemark = ref('');
const reversing = ref(false);

const reverseReasonOptions = [
  { value: 'entry_error', label: '录入错误' },
  { value: 'duplicate_receipt', label: '重复入库' },
  { value: 'return_to_vendor', label: '到货退回' },
  { value: 'other', label: '其他' },
];

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

const reversedSourceReceiptIds = computed(() => new Set(
  store.sortedReceipts
    .filter((receipt) => receipt.direction === 'reversal' && receipt.source_receipt_id)
    .map((receipt) => Number(receipt.source_receipt_id))
));

const receiptSummary = computed(() => {
  const list = filteredReceipts.value;
  const uniqueOrders = new Set(list.map((receipt) => receipt.order_no)).size;
  const totalQuantity = list.reduce((sum, receipt) => sum + Number(receipt.quantity || 0), 0);
  const latestReceiptDate = list[0]?.receipt_date || list[0]?.created_at || '';

  return {
    count: list.length,
    uniqueOrders,
    totalQuantity,
    latestReceiptDate: latestReceiptDate ? String(latestReceiptDate).slice(0, 10) : '-'
  };
});

const handleEdit = (item: InventoryItem) => {
  const newQty = prompt(`修改库存: ${item.model}\n当前数量: ${item.stock_quantity}`, item.stock_quantity.toString());
  if (newQty !== null && !isNaN(parseFloat(newQty))) {
    store.updateStock(item.id, parseFloat(newQty));
  }
};

const columns = createInventoryColumns({ onEdit: handleEdit });
function isReceiptReversible(receipt: InventoryReceipt) {
  return receipt.direction !== 'reversal' && !reversedSourceReceiptIds.value.has(Number(receipt.id));
}

const receiptColumns = createInventoryReceiptColumns({
  onJumpToOrder: (receipt: InventoryReceipt) => {
    router.push({
      name: 'procurement',
      query: {
        orderNo: receipt.order_no
      }
    }).catch(() => undefined);
  },
  onReverse: async (receipt: InventoryReceipt) => {
    reverseReceiptTarget.value = receipt;
    reverseReason.value = 'entry_error';
    reverseRemark.value = '';
    reverseDialogOpen.value = true;
  },
  isReceiptReversible
});

async function confirmReverseReceipt() {
  if (!reverseReceiptTarget.value) return;
  if (!reverseReason.value) return;
  reversing.value = true;
  try {
    await store.reverseReceipt(reverseReceiptTarget.value.id, {
      reversed_at: new Date().toISOString(),
      reverse_reason: reverseReason.value,
      remark: reverseRemark.value.trim() || undefined,
    });
    await loadReceipts(String(route.query.orderNo || '').trim());
    toast({
      title: '撤销成功',
      description: `已撤销 ${reverseReceiptTarget.value.order_no} 的入库记录`,
      variant: 'success'
    });
    window.localStorage.setItem(PROCUREMENT_REFRESH_SIGNAL_KEY, String(Date.now()));
    reverseDialogOpen.value = false;
    reverseReceiptTarget.value = null;
    reverseRemark.value = '';
  } catch (error: any) {
    const errorCode = String(error?.response?.data?.error || '');
    toast({
      title: '撤销失败',
      description: errorCode === 'RECEIPT_ALREADY_REVERSED'
        ? '该入库记录已经撤销过'
        : errorCode === 'REVERSE_REASON_REQUIRED'
          ? '请选择撤销原因'
          : '请稍后重试',
      variant: 'destructive'
    });
  } finally {
    reversing.value = false;
  }
}

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

function handleExportReceipts() {
  if (filteredReceipts.value.length === 0) {
    toast({
      title: '暂无可导出的入库记录',
      variant: 'destructive'
    });
    return;
  }

  store.exportReceiptsToCSV(filteredReceipts.value);
  toast({
    title: '导出成功',
    description: `已导出 ${filteredReceipts.value.length} 条采购入库记录`,
    variant: 'success'
  });
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
          <div class="text-2xl font-semibold">{{ receiptSummary.count }}</div>
          <p class="text-xs text-muted-foreground mt-1">当前筛选下的采购入库记录</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">涉及订单数</CardTitle>
          <Package class="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ receiptSummary.uniqueOrders }}</div>
          <p class="text-xs text-muted-foreground mt-1">当前记录覆盖的采购订单</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">累计入库数量</CardTitle>
          <Package class="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ receiptSummary.totalQuantity }}</div>
          <p class="text-xs text-muted-foreground mt-1">当前筛选结果数量总和</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-xs text-muted-foreground">最近入库日期</CardTitle>
          <ScrollText class="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ receiptSummary.latestReceiptDate }}</div>
          <p class="text-xs text-muted-foreground mt-1">按当前筛选结果计算</p>
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
            <Button variant="outline" @click="handleExportReceipts">
              <Download class="w-4 h-4 mr-2" />
              导出
            </Button>
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
    <ConfirmDialog
      v-model:open="reverseDialogOpen"
      title="确认撤销入库"
      confirm-text="确认撤销"
      cancel-text="取消"
      variant="warning"
      :loading="reversing"
      @confirm="confirmReverseReceipt"
    >
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">
          <span v-if="reverseReceiptTarget">
            订单 <span class="font-medium text-foreground">{{ reverseReceiptTarget.order_no }}</span>
            的这条入库记录将被撤销。
          </span>
        </p>
        <label class="block space-y-1 text-sm">
          <span class="text-foreground">撤销原因</span>
          <select v-model="reverseReason" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="option in reverseReasonOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-foreground">补充说明</span>
          <Textarea v-model="reverseRemark" rows="3" placeholder="例如：录入数量错误，重新按实际到货数量登记" />
        </label>
      </div>
    </ConfirmDialog>
  </div>
</template>
