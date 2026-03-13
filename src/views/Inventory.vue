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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
const receiptSearchQuery = ref(String(route.query.keyword || '').trim());
const receiptOrderFilter = ref(String(route.query.orderNo || '').trim());
const receiptDirectionFilter = ref<'ALL' | 'in' | 'reversal'>(String(route.query.direction || 'ALL') as 'ALL' | 'in' | 'reversal');
const reverseReasonFilter = ref(String(route.query.reverseReason || 'ALL'));
const receiptPage = ref(Math.max(1, Number(route.query.page) || 1));
const receiptPageSize = ref(Math.min(200, Math.max(10, Number(route.query.pageSize) || store.receiptsPageSize || 50)));
const debouncedReceiptOrderFilter = refDebounced(receiptOrderFilter, 300);
const debouncedReceiptSearchQuery = refDebounced(receiptSearchQuery, 300);
const reverseDialogOpen = ref(false);
const reverseReceiptTarget = ref<InventoryReceipt | null>(null);
const auditReceiptId = ref<number | null>(null);
const auditRows = ref<InventoryReceipt[]>([]);
const reverseReason = ref('entry_error');
const reverseRemark = ref('');
const reverseQuantity = ref('');
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
  return store.sortedReceipts;
});

const receiptSummary = computed(() => {
  const list = filteredReceipts.value;
  const uniqueOrders = new Set(list.map((receipt) => receipt.order_no)).size;
  const totalQuantity = list
    .filter((receipt) => receipt.direction !== 'reversal')
    .reduce((sum, receipt) => sum + Number(receipt.quantity || 0), 0);
  const netQuantity = list.reduce((sum, receipt) => sum + Number(receipt.quantity || 0), 0);
  const latestReceiptDate = list[0]?.receipt_date || list[0]?.created_at || '';

  return {
    count: list.length,
    uniqueOrders,
    totalQuantity,
    netQuantity,
    latestReceiptDate: latestReceiptDate ? String(latestReceiptDate).slice(0, 10) : '-'
  };
});

const receiptTotalPages = computed(() => Math.max(1, Math.ceil((store.receiptsTotal || 0) / (store.receiptsPageSize || 50))));

const availableReverseReasonOptions = computed(() => {
  return [
    { value: 'ALL', label: '全部原因' },
    ...reverseReasonOptions
  ];
});

const selectedReceiptAudit = computed(() => {
  if (!auditReceiptId.value) return null;

  const source = auditRows.value.length > 0 ? auditRows.value : store.receipts;
  const matched = source.find((receipt) => Number(receipt.id) === Number(auditReceiptId.value))
    || source.find((receipt) => Number(receipt.source_receipt_id || 0) === Number(auditReceiptId.value));

  if (!matched) return null;

  const originalId = matched.direction === 'reversal'
    ? Number(matched.source_receipt_id || 0)
    : Number(matched.id);

  const original = source.find((receipt) => Number(receipt.id) === originalId && receipt.direction !== 'reversal');
  if (!original) return null;

  const reversals = source
    .filter((receipt) => Number(receipt.source_receipt_id || 0) === originalId)
    .sort((a, b) => new Date(b.receipt_date || b.created_at || 0).getTime() - new Date(a.receipt_date || a.created_at || 0).getTime());
  const netQuantity = Number(original.quantity || 0) - reversals.reduce((sum, receipt) => sum + Math.abs(Number(receipt.quantity || 0)), 0);

  return {
    original,
    reversals,
    netQuantity
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
  return receipt.direction !== 'reversal' && Number(receipt.reversible_quantity || 0) > 0;
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
    reverseQuantity.value = '';
    reverseDialogOpen.value = true;
  },
  onInspect: (receipt: InventoryReceipt) => {
    openReceiptAudit(receipt).catch(() => undefined);
  },
  isReceiptReversible
});

async function confirmReverseReceipt() {
  if (!reverseReceiptTarget.value) return;
  if (!reverseReason.value) return;
  reversing.value = true;
  const quantityValue = reverseQuantity.value.trim();
  try {
    await store.reverseReceipt(reverseReceiptTarget.value.id, {
      reversed_at: new Date().toISOString(),
      reverse_reason: reverseReason.value,
      remark: reverseRemark.value.trim() || undefined,
      quantity: quantityValue ? Number(quantityValue) : undefined,
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
    auditRows.value = [];
    reverseRemark.value = '';
    reverseQuantity.value = '';
  } catch (error: any) {
    const errorCode = String(error?.response?.data?.error || '');
    toast({
      title: '撤销失败',
      description: errorCode === 'RECEIPT_ALREADY_REVERSED'
        ? '该入库记录已经撤销过'
        : errorCode === 'RECEIPT_ALREADY_FULLY_REVERSED'
          ? '该入库记录已经全部撤销'
          : errorCode === 'REVERSE_QUANTITY_EXCEEDED'
            ? '本次撤销数量超过剩余可撤销量'
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
  receiptSearchQuery.value = String(route.query.keyword || '').trim();
  receiptOrderFilter.value = String(route.query.orderNo || '').trim();
  receiptDirectionFilter.value = String(route.query.direction || 'ALL') as 'ALL' | 'in' | 'reversal';
  reverseReasonFilter.value = String(route.query.reverseReason || 'ALL');
  receiptPage.value = Math.max(1, Number(route.query.page) || 1);
  receiptPageSize.value = Math.min(200, Math.max(10, Number(route.query.pageSize) || store.receiptsPageSize || 50));
}

function updateInventoryRouteQuery(orderNo: string, keyword: string, direction: string, reverseReason: string, page: number, pageSize: number) {
  const nextQuery = { ...route.query };
  const trimmedOrderNo = orderNo.trim();
  const trimmedKeyword = keyword.trim();
  if (trimmedOrderNo) nextQuery.orderNo = trimmedOrderNo;
  else delete nextQuery.orderNo;
  if (trimmedKeyword) nextQuery.keyword = trimmedKeyword;
  else delete nextQuery.keyword;
  if (direction && direction !== 'ALL') nextQuery.direction = direction;
  else delete nextQuery.direction;
  if (reverseReason && reverseReason !== 'ALL') nextQuery.reverseReason = reverseReason;
  else delete nextQuery.reverseReason;
  if (page > 1) nextQuery.page = String(page);
  else delete nextQuery.page;
  if (pageSize !== 50) nextQuery.pageSize = String(pageSize);
  else delete nextQuery.pageSize;
  router.replace({ query: nextQuery }).catch(() => undefined);
}

function clearReceiptOrderFilter() {
  receiptSearchQuery.value = '';
  receiptOrderFilter.value = '';
  receiptDirectionFilter.value = 'ALL';
  reverseReasonFilter.value = 'ALL';
  receiptPage.value = 1;
  receiptPageSize.value = 50;
  updateInventoryRouteQuery('', '', 'ALL', 'ALL', 1, 50);
}

async function openReceiptAudit(receipt: InventoryReceipt) {
  const originalId = receipt.direction === 'reversal'
    ? Number(receipt.source_receipt_id || 0)
    : Number(receipt.id);
  auditReceiptId.value = originalId;

  try {
    auditRows.value = await store.fetchAllInventoryReceipts({
      orderNo: receipt.order_no
    });
  } catch {
    auditRows.value = [];
    toast({
      title: '轨迹加载失败',
      description: '无法获取完整的入库撤销轨迹，请稍后重试',
      variant: 'destructive'
    });
  }
}

function closeReceiptAudit() {
  auditReceiptId.value = null;
  auditRows.value = [];
}

function handleExportReceipts() {
  const orderNo = String(route.query.orderNo || '').trim();
  const keyword = String(route.query.keyword || '').trim();
  const direction = String(route.query.direction || '').trim();
  const reverseReason = String(route.query.reverseReason || '').trim();
  store.fetchAllInventoryReceipts({
    ...(orderNo ? { orderNo } : {}),
    ...(keyword ? { keyword } : {}),
    ...(direction ? { direction: direction as 'in' | 'reversal' } : {}),
    ...(reverseReason ? { reverseReason } : {}),
  }).then((rows) => {
    if (rows.length === 0) {
      toast({
        title: '暂无可导出的入库记录',
        variant: 'destructive'
      });
      return;
    }

    store.exportReceiptsToCSV(rows);
    toast({
      title: '导出成功',
      description: `已导出 ${rows.length} 条采购入库记录`,
      variant: 'success'
    });
  }).catch(() => {
    toast({
      title: '导出失败',
      description: '无法获取完整的采购入库记录，请稍后重试',
      variant: 'destructive'
    });
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
    await store.fetchInventoryReceipts({
      ...(orderNo ? { orderNo } : {}),
      ...(receiptSearchQuery.value.trim() ? { keyword: receiptSearchQuery.value.trim() } : {}),
      ...(receiptDirectionFilter.value !== 'ALL' ? { direction: receiptDirectionFilter.value } : {}),
      ...(reverseReasonFilter.value !== 'ALL' ? { reverseReason: reverseReasonFilter.value } : {}),
      page: receiptPage.value,
      pageSize: receiptPageSize.value
    });
    if (auditReceiptId.value && !selectedReceiptAudit.value) {
      auditReceiptId.value = null;
      auditRows.value = [];
    }
  } catch {
    toast({
      title: '入库记录加载失败',
      description: '无法获取最新采购入库记录，请稍后重试',
      variant: 'destructive'
    });
  }
}

function nextReceiptPage() {
  if (receiptPage.value >= receiptTotalPages.value) return;
  receiptPage.value += 1;
}

function prevReceiptPage() {
  if (receiptPage.value <= 1) return;
  receiptPage.value -= 1;
}

onMounted(() => {
  loadInventoryData().catch(() => undefined);
});

watch(() => [route.query.orderNo, route.query.keyword, route.query.direction, route.query.reverseReason, route.query.page, route.query.pageSize], () => {
  syncReceiptOrderFilterFromRoute();
  loadReceipts(String(route.query.orderNo || '').trim()).catch(() => undefined);
});

watch(
  [debouncedReceiptOrderFilter, debouncedReceiptSearchQuery, receiptDirectionFilter, reverseReasonFilter],
  ([orderNo, keyword, direction, reverseReason]) => {
    receiptPage.value = 1;
    updateInventoryRouteQuery(orderNo, keyword, direction, reverseReason, 1, receiptPageSize.value);
  }
);

watch(receiptPage, (page) => {
  updateInventoryRouteQuery(receiptOrderFilter.value, receiptSearchQuery.value, receiptDirectionFilter.value, reverseReasonFilter.value, page, receiptPageSize.value);
});

watch(receiptPageSize, (pageSize) => {
  receiptPage.value = 1;
  updateInventoryRouteQuery(receiptOrderFilter.value, receiptSearchQuery.value, receiptDirectionFilter.value, reverseReasonFilter.value, 1, pageSize);
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
          <CardTitle class="text-xs text-muted-foreground">净入库数量</CardTitle>
          <Package class="h-4 w-4 text-sky-500" />
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-semibold">{{ receiptSummary.netQuantity }}</div>
          <p class="text-xs text-muted-foreground mt-1">已扣除撤销记录后的净值</p>
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
            <select v-model="receiptDirectionFilter" class="rounded-md border bg-background px-3 py-2 text-sm">
              <option value="ALL">全部方向</option>
              <option value="in">仅入库</option>
              <option value="reversal">仅撤销</option>
            </select>
            <select v-model="reverseReasonFilter" class="rounded-md border bg-background px-3 py-2 text-sm">
              <option
                v-for="option in availableReverseReasonOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
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
        <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            页码 {{ store.receiptsPage }} / {{ receiptTotalPages }}，共 {{ store.receiptsTotal }} 条
          </div>
          <div class="flex items-center gap-2">
            <select v-model="receiptPageSize" class="rounded-md border bg-background px-2 py-1 text-xs">
              <option :value="20">20 / 页</option>
              <option :value="50">50 / 页</option>
              <option :value="100">100 / 页</option>
            </select>
            <Button variant="outline" size="sm" :disabled="store.receiptsPage <= 1 || store.receiptsLoading" @click="prevReceiptPage">
              上一页
            </Button>
            <Button variant="outline" size="sm" :disabled="store.receiptsPage >= receiptTotalPages || store.receiptsLoading" @click="nextReceiptPage">
              下一页
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
    <Sheet :open="Boolean(selectedReceiptAudit)" @update:open="(open) => { if (!open) closeReceiptAudit(); }">
      <SheetContent side="right" class="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>入库撤销轨迹</SheetTitle>
          <SheetDescription>
            查看原始入库记录与后续撤销流水，便于核对净入库结果。
          </SheetDescription>
        </SheetHeader>
        <div v-if="selectedReceiptAudit" class="mt-6 space-y-4">
          <div class="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              @click="router.push({ name: 'procurement', query: { orderNo: selectedReceiptAudit.original.order_no } }).catch(() => undefined)"
            >
              跳转采购单
            </Button>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">原始订单</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.order_no }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">物料</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.item_name }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">原始入库数量</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.quantity }} {{ selectedReceiptAudit.original.unit || '' }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">剩余可撤销</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.reversible_quantity || 0 }} {{ selectedReceiptAudit.original.unit || '' }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">已撤销量</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.reversed_quantity || 0 }} {{ selectedReceiptAudit.original.unit || '' }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">净入库数量</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.netQuantity }} {{ selectedReceiptAudit.original.unit || '' }}</div>
            </div>
          </div>
          <div class="rounded-md border">
            <div class="grid gap-3 border-b bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground md:grid-cols-[140px_100px_120px_1fr]">
              <div>撤销日期</div>
              <div>撤销量</div>
              <div>撤销原因</div>
              <div>说明</div>
            </div>
            <div v-if="selectedReceiptAudit.reversals.length === 0" class="px-4 py-6 text-sm text-muted-foreground">
              该入库记录尚无撤销流水。
            </div>
            <div v-else class="divide-y">
              <div
                v-for="receipt in selectedReceiptAudit.reversals"
                :key="receipt.id"
                class="grid gap-3 px-4 py-3 text-sm md:grid-cols-[140px_100px_120px_1fr]"
              >
                <div>{{ String(receipt.receipt_date || receipt.created_at || '-').slice(0, 10) }}</div>
                <div class="font-medium text-rose-600">{{ receipt.quantity }} {{ receipt.unit || '' }}</div>
                <div>{{ receipt.reverse_reason || '-' }}</div>
                <div class="text-muted-foreground">{{ receipt.remark || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
        <div
          v-if="reverseReceiptTarget"
          class="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-3"
        >
          <div>
            <div class="text-xs text-muted-foreground">原始数量</div>
            <div class="font-medium">{{ reverseReceiptTarget.quantity }} {{ reverseReceiptTarget.unit || '' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">已撤销量</div>
            <div class="font-medium">{{ reverseReceiptTarget.reversed_quantity || 0 }} {{ reverseReceiptTarget.unit || '' }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">剩余可撤销</div>
            <div class="font-medium">{{ reverseReceiptTarget.reversible_quantity || 0 }} {{ reverseReceiptTarget.unit || '' }}</div>
          </div>
        </div>
        <label class="block space-y-1 text-sm">
          <span class="text-foreground">撤销原因</span>
          <select v-model="reverseReason" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="option in reverseReasonOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-foreground">本次撤销数量</span>
          <div class="flex items-center gap-2">
            <Input
              v-model="reverseQuantity"
              type="number"
              min="0"
              :max="String(reverseReceiptTarget?.reversible_quantity || 0)"
              step="0.01"
              placeholder="留空则撤销全部剩余量"
            />
            <Button
              type="button"
              variant="outline"
              @click="reverseQuantity = String(reverseReceiptTarget?.reversible_quantity || '')"
            >
              全部撤销
            </Button>
          </div>
        </label>
        <label class="block space-y-1 text-sm">
          <span class="text-foreground">补充说明</span>
          <Textarea v-model="reverseRemark" rows="3" placeholder="例如：录入数量错误，重新按实际到货数量登记" />
        </label>
      </div>
    </ConfirmDialog>
  </div>
</template>
