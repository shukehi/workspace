<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useToastStore } from '@/stores/useToastStore';
import { useInventoryReceiptFlow } from '@/features/inventory/composables/useInventoryReceiptFlow';
import { useInventoryReceiptRouteState } from '@/features/inventory/composables/useInventoryReceiptRouteState';
import DataTable from '@/components/data-table/DataTable.vue';
import { createInventoryColumns } from '@/components/inventory/InventoryColumns';
import { createInventoryReceiptColumns } from '@/components/inventory/InventoryReceiptColumns';
import { createInventoryOutboundColumns } from '@/components/inventory/InventoryOutboundColumns';
import { createInventoryLocationColumns } from '@/components/inventory/InventoryLocationColumns';
import InventoryOutboundDialog from '@/components/inventory/InventoryOutboundDialog.vue';
import InventoryLocationDialog from '@/components/inventory/InventoryLocationDialog.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Download, MapPin, Package, RefreshCcw, Search, ScrollText, Send, Warehouse } from 'lucide-vue-next';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import type { InventoryItem, InventoryLocation, InventoryMovement, InventoryOutbound, InventoryReceipt } from '@/types/inventory';

const PROCUREMENT_REFRESH_SIGNAL_KEY = 'procurement-orders-refresh-signal';

const store = useInventoryStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();

const activeTab = ref(String(route.query.tab || (route.query.orderNo ? 'receipts' : 'inventory')));
const inventoryTableRef = ref<any>(null);

const activeCategory = ref('ALL');
const searchQuery = ref('');
const debouncedSearchQuery = refDebounced(searchQuery, 300);
const selectedWarehouseFilter = ref(String(route.query.warehouseId || ''));
const selectedLocationFilter = ref(String(route.query.locationId || ''));
const lowStockOnly = ref(String(route.query.lowStockOnly || '').toLowerCase() === 'true');
const reconciliationOnly = ref(false);
const selectedInventoryRows = ref<InventoryItem[]>([]);
const selectedMovementItem = ref<InventoryItem | null>(null);

const outboundDialogOpen = ref(false);
const outboundSaving = ref(false);
const outboundNoFilter = ref('');
const outboundKeyword = ref('');
const debouncedOutboundKeyword = refDebounced(outboundKeyword, 300);
const outboundOperatorFilter = ref('');
const outboundWarehouseFilter = ref('');
const outboundLocationFilter = ref('');
const outboundStartDate = ref('');
const outboundEndDate = ref('');
const outboundPage = ref(1);
const outboundPageSize = ref(50);
const selectedOutboundDetail = ref<InventoryOutbound | null>(null);
const reverseOutboundDialogOpen = ref(false);
const reverseOutboundTarget = ref<InventoryOutbound | null>(null);
const reverseOutboundReason = ref('出库冲销');
const reverseOutboundRemark = ref('');
const reversingOutbound = ref(false);

const locationSearchQuery = ref('');
const locationDialogOpen = ref(false);
const locationDialogSaving = ref(false);
const editingLocation = ref<InventoryLocation | null>(null);

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
  { id: '包装', label: '包装材料' },
];

const {
  receiptSearchQuery,
  receiptOrderFilter,
  receiptDirectionFilter,
  reverseReasonFilter,
  receiptPage,
  receiptPageSize,
  clearReceiptRouteFilters,
  buildReceiptFetchParams,
} = useInventoryReceiptRouteState(route, router, {
  activeTab,
  defaultPageSize: store.receiptsPageSize || 50,
  loadReceipts: (orderNo = '') => loadReceipts(orderNo),
});

const availableReverseReasonOptions = computed(() => {
  return [
    { value: 'ALL', label: '全部原因' },
    ...reverseReasonOptions,
  ];
});

const availableInventoryLocations = computed(() => {
  const warehouseId = Number(selectedWarehouseFilter.value);
  const base = store.activeLocations;
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
  return base.filter((location) => location.warehouse_id === warehouseId);
});

const availableOutboundLocations = computed(() => {
  const warehouseId = Number(outboundWarehouseFilter.value);
  const base = store.activeLocations;
  if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
  return base.filter((location) => location.warehouse_id === warehouseId);
});

const filteredItems = computed(() => {
  let list = store.sortedItems;
  if (activeCategory.value !== 'ALL') {
    list = list.filter((item) => item.category === activeCategory.value);
  }
  if (reconciliationOnly.value) {
    list = list.filter((item) => {
      const locationTotal = item.locations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
      return Number(item.stock_quantity || 0) !== locationTotal;
    });
  }
  return list;
});

const reconciliationSummary = computed(() => {
  const rows = store.items.map((item) => {
    const locationTotal = item.locations.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
    const diff = Number(item.stock_quantity || 0) - locationTotal;
    return {
      item,
      locationTotal,
      diff,
      hasDiff: diff !== 0,
    };
  });

  const mismatched = rows.filter((row) => row.hasDiff);
  const totalAbsoluteDiff = mismatched.reduce((sum, row) => sum + Math.abs(row.diff), 0);

  return {
    mismatchedCount: mismatched.length,
    totalAbsoluteDiff,
    matchedCount: rows.length - mismatched.length,
  };
});

const filteredReceipts = computed(() => store.sortedReceipts);

const filteredLocations = computed(() => {
  const query = locationSearchQuery.value.trim().toLowerCase();
  if (!query) return store.locations;
  return store.locations.filter((location) => {
    return [
      location.code,
      location.name,
      location.warehouse_name,
      location.remark,
    ].some((candidate) => String(candidate || '').toLowerCase().includes(query));
  });
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
    latestReceiptDate: latestReceiptDate ? String(latestReceiptDate).slice(0, 10) : '-',
  };
});

const receiptTotalPages = computed(() => Math.max(1, Math.ceil((store.receiptsTotal || 0) / (store.receiptsPageSize || 50))));

const outboundSummary = computed(() => {
  const list = store.sortedOutbounds;
  const totalCount = list.length;
  const totalLocations = new Set(list.map((item) => item.location_id)).size;
  const totalIssuedQuantity = list
    .filter((item) => item.direction === 'out')
    .reduce((sum, item) => sum + item.items.reduce((itemSum, row) => itemSum + Number(row.quantity || 0), 0), 0);
  const totalReversedQuantity = list
    .filter((item) => item.direction === 'reversal')
    .reduce((sum, item) => sum + item.items.reduce((itemSum, row) => itemSum + Number(row.quantity || 0), 0), 0);
  return {
    totalCount,
    totalLocations,
    totalIssuedQuantity,
    netQuantity: totalIssuedQuantity - totalReversedQuantity,
  };
});

const outboundTotalPages = computed(() => Math.max(1, Math.ceil((store.outboundsTotal || 0) / (store.outboundsPageSize || 50))));
const selectedMovementSummary = computed(() => {
  if (!selectedMovementItem.value) return null;
  const rows = store.sortedMovements;
  const netChange = rows.reduce((sum, row) => sum + Number(row.delta_quantity || 0), 0);
  const lastMovement = rows[0];
  return {
    total: store.movementsTotal,
    netChange,
    lastOccurredAt: lastMovement?.occurred_at || lastMovement?.created_at || '',
  };
});

function formatMovementSourceLabel(sourceType: InventoryMovement['source_type']) {
  if (sourceType === 'manual_adjustment') return '手工调账';
  if (sourceType === 'receipt_in') return '采购入库';
  if (sourceType === 'receipt_reversal') return '入库撤销';
  if (sourceType === 'outbound') return '正式出库';
  if (sourceType === 'outbound_reversal') return '出库冲销';
  return sourceType || '-';
}

const currentExportLabel = computed(() => {
  if (activeTab.value === 'inventory') return '导出库位余额';
  if (activeTab.value === 'receipts') return '导出入库记录';
  if (activeTab.value === 'outbounds') return '导出出库记录';
  return '';
});

function createReceiptColumns() {
  return createInventoryReceiptColumns({
    onJumpToOrder: (receipt: InventoryReceipt) => {
      router.push({
        name: 'procurement',
        query: { orderNo: receipt.order_no },
      }).catch(() => undefined);
    },
    onReverse: (receipt: InventoryReceipt) => {
      requestReverseReceipt(receipt);
    },
    onInspect: (receipt: InventoryReceipt) => {
      openReceiptAudit(receipt).catch(() => undefined);
    },
    onViewDetail: (receipt: InventoryReceipt) => {
      router.push({
        name: 'inventory-receipt-detail',
        params: { id: receipt.id },
      }).catch(() => undefined);
    },
    isReceiptReversible,
  });
}

const inventoryColumns = createInventoryColumns({
  onViewMovement: (item) => {
    openMovementSheet(item).catch(() => undefined);
  },
});
const receiptColumns = createReceiptColumns();
const outboundColumns = createInventoryOutboundColumns({
  onViewDetail: async (outbound) => {
    selectedOutboundDetail.value = await store.fetchInventoryOutbound(outbound.id);
  },
  onReverse: (outbound) => {
    reverseOutboundTarget.value = outbound;
    reverseOutboundReason.value = '出库冲销';
    reverseOutboundRemark.value = '';
    reverseOutboundDialogOpen.value = true;
  },
});
const locationColumns = createInventoryLocationColumns({
  onEdit: (location) => {
    editingLocation.value = location;
    locationDialogOpen.value = true;
  },
});

function isReceiptReversible(receipt: InventoryReceipt) {
  return receipt.direction !== 'reversal' && Number(receipt.reversible_quantity || 0) > 0;
}

const {
  reverseDialogOpen,
  reverseReceiptTarget,
  auditReceiptId,
  reverseReason,
  reverseRemark,
  reverseQuantity,
  reversing,
  selectedReceiptAudit,
  requestReverseReceipt,
  confirmReverseReceipt: confirmReceiptFlowReverse,
  openReceiptAudit,
  closeReceiptAudit,
  reconcileReceiptAudit,
} = useInventoryReceiptFlow({
  store,
  toast,
  loadReceipts: (orderNo = '') => loadReceipts(orderNo),
  reloadInventory: () => loadInventoryList(),
  notifyProcurementRefresh: () => {
    window.localStorage.setItem(PROCUREMENT_REFRESH_SIGNAL_KEY, String(Date.now()));
  },
});

async function confirmReverseReceipt() {
  await confirmReceiptFlowReverse(String(route.query.orderNo || '').trim());
}

function clearReceiptOrderFilter() {
  clearReceiptRouteFilters();
}

function nextReceiptPage() {
  if (receiptPage.value >= receiptTotalPages.value) return;
  receiptPage.value += 1;
}

function prevReceiptPage() {
  if (receiptPage.value <= 1) return;
  receiptPage.value -= 1;
}

function nextOutboundPage() {
  if (outboundPage.value >= outboundTotalPages.value) return;
  outboundPage.value += 1;
}

function prevOutboundPage() {
  if (outboundPage.value <= 1) return;
  outboundPage.value -= 1;
}

async function loadInventoryList() {
  try {
    await store.fetchInventory({
      warehouseId: selectedWarehouseFilter.value || undefined,
      locationId: selectedLocationFilter.value || undefined,
      keyword: debouncedSearchQuery.value.trim() || undefined,
      lowStockOnly: lowStockOnly.value,
    });
  } catch {
    toast({
      title: '库存加载失败',
      description: '无法获取最新库存数据，请稍后重试',
      variant: 'destructive',
    });
  }
}

async function loadReceipts(orderNo = '') {
  try {
    await store.fetchInventoryReceipts(buildReceiptFetchParams(orderNo));
    reconcileReceiptAudit();
  } catch {
    toast({
      title: '入库记录加载失败',
      description: '无法获取最新采购入库记录，请稍后重试',
      variant: 'destructive',
    });
  }
}

async function loadOutbounds() {
  try {
    await store.fetchInventoryOutbounds({
      outboundNo: outboundNoFilter.value.trim() || undefined,
      keyword: debouncedOutboundKeyword.value.trim() || undefined,
      operator: outboundOperatorFilter.value.trim() || undefined,
      warehouseId: outboundWarehouseFilter.value || undefined,
      locationId: outboundLocationFilter.value || undefined,
      startDate: outboundStartDate.value || undefined,
      endDate: outboundEndDate.value || undefined,
      page: outboundPage.value,
      pageSize: outboundPageSize.value,
    });
  } catch {
    toast({
      title: '出库记录加载失败',
      description: '无法获取最新出库流水，请稍后重试',
      variant: 'destructive',
    });
  }
}

async function loadInventoryData() {
  await Promise.all([
    store.fetchInventoryLocations(),
    loadInventoryList(),
    loadReceipts(String(route.query.orderNo || '').trim()),
    loadOutbounds(),
  ]);
}

function handleExportReceipts() {
  const orderNo = String(route.query.orderNo || '').trim();
  const keyword = String(route.query.keyword || '').trim();
  const direction = String(route.query.direction || '').trim();
  const reverseReasonQuery = String(route.query.reverseReason || '').trim();
  store.fetchAllInventoryReceipts({
    ...(orderNo ? { orderNo } : {}),
    ...(keyword ? { keyword } : {}),
    ...(direction ? { direction: direction as 'in' | 'reversal' } : {}),
    ...(reverseReasonQuery ? { reverseReason: reverseReasonQuery } : {}),
  }).then((rows) => {
    if (rows.length === 0) {
      toast({
        title: '暂无可导出的入库记录',
        variant: 'destructive',
      });
      return;
    }

    store.exportReceiptsToCSV(rows);
    toast({
      title: '导出成功',
      description: `已导出 ${rows.length} 条采购入库记录`,
      variant: 'success',
    });
  }).catch(() => {
    toast({
      title: '导出失败',
      description: '无法获取完整的采购入库记录，请稍后重试',
      variant: 'destructive',
    });
  });
}

function handleExportInventory() {
  if (filteredItems.value.length === 0) {
    toast({
      title: '暂无可导出的库存结果',
      variant: 'destructive',
    });
    return;
  }

  store.exportInventoryToCSV(filteredItems.value);
  toast({
    title: '导出成功',
    description: `已导出 ${filteredItems.value.length} 条库存物料及库位余额`,
    variant: 'success',
  });
}

function handleExportOutbounds() {
  store.fetchAllInventoryOutbounds({
    outboundNo: outboundNoFilter.value.trim() || undefined,
    keyword: debouncedOutboundKeyword.value.trim() || undefined,
    operator: outboundOperatorFilter.value.trim() || undefined,
    warehouseId: outboundWarehouseFilter.value || undefined,
    locationId: outboundLocationFilter.value || undefined,
    startDate: outboundStartDate.value || undefined,
    endDate: outboundEndDate.value || undefined,
  }).then((rows) => {
    if (rows.length === 0) {
      toast({
        title: '暂无可导出的出库记录',
        variant: 'destructive',
      });
      return;
    }

    store.exportOutboundsToCSV(rows);
    toast({
      title: '导出成功',
      description: `已导出 ${rows.length} 张正式出库单`,
      variant: 'success',
    });
  }).catch(() => {
    toast({
      title: '导出失败',
      description: '无法获取完整的正式出库记录，请稍后重试',
      variant: 'destructive',
    });
  });
}

function handleContextExport() {
  if (activeTab.value === 'inventory') {
    handleExportInventory();
    return;
  }
  if (activeTab.value === 'receipts') {
    handleExportReceipts();
    return;
  }
  if (activeTab.value === 'outbounds') {
    handleExportOutbounds();
  }
}

function openOutboundDialog() {
  if (selectedInventoryRows.value.length === 0) {
    toast({
      title: '请先勾选物料',
      description: '至少选择一项库存物料后才能登记出库',
      variant: 'destructive',
    });
    return;
  }
  outboundDialogOpen.value = true;
}

async function handleSubmitOutbound(payload: {
  warehouse_id: number;
  location_id: number;
  operator?: string;
  reason: string;
  remark?: string;
  outbound_date: string;
  items: Array<{ material_id: number; item_name: string; unit: string; quantity: number }>;
}) {
  outboundSaving.value = true;
  try {
    await store.createInventoryOutbound(payload);
    outboundDialogOpen.value = false;
    selectedInventoryRows.value = [];
    inventoryTableRef.value?.clearSelection?.();
    await Promise.all([loadInventoryList(), loadOutbounds()]);
    toast({
      title: '出库登记成功',
      description: `已生成 ${payload.items.length} 条出库明细`,
      variant: 'success',
    });
  } catch {
    toast({
      title: '出库登记失败',
      description: '请检查所选库位余额后重试',
      variant: 'destructive',
    });
  } finally {
    outboundSaving.value = false;
  }
}

async function confirmReverseOutbound() {
  if (!reverseOutboundTarget.value) return;
  reversingOutbound.value = true;
  try {
    await store.reverseInventoryOutbound(reverseOutboundTarget.value.id, {
      reason: reverseOutboundReason.value.trim() || '出库冲销',
      remark: reverseOutboundRemark.value.trim() || undefined,
      outbound_date: new Date().toISOString(),
    });
    reverseOutboundDialogOpen.value = false;
    reverseOutboundTarget.value = null;
    reverseOutboundReason.value = '出库冲销';
    reverseOutboundRemark.value = '';
    await Promise.all([loadInventoryList(), loadOutbounds()]);
    toast({
      title: '出库冲销成功',
      description: '已恢复对应库位余额和总库存',
      variant: 'success',
    });
  } catch {
    toast({
      title: '出库冲销失败',
      description: '当前出库单可能已冲销或库存数据异常',
      variant: 'destructive',
    });
  } finally {
    reversingOutbound.value = false;
  }
}

async function handleLocationSubmit(payload: {
  warehouse_id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  remark?: string;
  sort_order?: number;
}) {
  locationDialogSaving.value = true;
  const isEditing = Boolean(editingLocation.value);
  try {
    if (editingLocation.value) {
      await store.updateInventoryLocation(editingLocation.value.id, payload);
    } else {
      await store.createInventoryLocation(payload);
    }
    await store.fetchInventoryLocations();
    locationDialogOpen.value = false;
    editingLocation.value = null;
    toast({
      title: isEditing ? '库位更新成功' : '库位创建成功',
      variant: 'success',
    });
  } catch {
    toast({
      title: '库位保存失败',
      description: '请检查库位编码是否重复后重试',
      variant: 'destructive',
    });
  } finally {
    locationDialogSaving.value = false;
  }
}

function openCreateLocationDialog() {
  editingLocation.value = null;
  locationDialogOpen.value = true;
}

function closeOutboundDetail() {
  selectedOutboundDetail.value = null;
}

async function openMovementSheet(item: InventoryItem) {
  selectedMovementItem.value = item;
  try {
    await store.fetchInventoryMovements({
      materialId: item.id,
      page: 1,
      pageSize: 20,
    });
  } catch {
    selectedMovementItem.value = null;
    toast({
      title: '轨迹加载失败',
      description: '无法获取该物料的库存变动记录，请稍后重试',
      variant: 'destructive',
    });
  }
}

function closeMovementSheet() {
  selectedMovementItem.value = null;
}

watch(selectedWarehouseFilter, (warehouseId) => {
  if (!warehouseId) {
    selectedLocationFilter.value = '';
    return;
  }
  const valid = availableInventoryLocations.value.some((location) => location.id === Number(selectedLocationFilter.value));
  if (!valid) {
    selectedLocationFilter.value = '';
  }
});

watch(outboundWarehouseFilter, (warehouseId) => {
  if (!warehouseId) {
    outboundLocationFilter.value = '';
    return;
  }
  const valid = availableOutboundLocations.value.some((location) => location.id === Number(outboundLocationFilter.value));
  if (!valid) {
    outboundLocationFilter.value = '';
  }
});

watch(
  [selectedWarehouseFilter, selectedLocationFilter, lowStockOnly, debouncedSearchQuery],
  () => {
    void loadInventoryList();
  },
);

watch(
  [
    outboundNoFilter,
    debouncedOutboundKeyword,
    outboundOperatorFilter,
    outboundWarehouseFilter,
    outboundLocationFilter,
    outboundStartDate,
    outboundEndDate,
  ],
  () => {
    outboundPage.value = 1;
    void loadOutbounds();
  },
);

watch([outboundPage, outboundPageSize], () => {
  void loadOutbounds();
});

watch(activeTab, (tab) => {
  const nextQuery = { ...route.query };
  if (tab === 'inventory') {
    delete nextQuery.tab;
  } else {
    nextQuery.tab = tab;
  }
  router.replace({ query: nextQuery }).catch(() => undefined);
});

onMounted(() => {
  loadInventoryData().catch(() => undefined);
});
</script>

<template>
  <div class="h-full flex flex-col p-6 md:p-8 gap-6 bg-muted/20">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <h2 class="text-3xl font-semibold tracking-tight">库存管理</h2>
        <p class="text-muted-foreground mt-1">围绕库位、入库、出库和库存余额统一管理仓储动作。</p>
      </div>
      <div class="flex items-center gap-2">
        <Button v-if="currentExportLabel" variant="outline" size="sm" @click="handleContextExport">
          <Download class="w-4 h-4 mr-2" />
          {{ currentExportLabel }}
        </Button>
        <Button variant="outline" size="sm" @click="loadInventoryData" :disabled="store.loading || store.receiptsLoading || store.outboundsLoading || store.locationsLoading">
          <RefreshCcw class="w-4 h-4 mr-2" :class="{ 'animate-spin': store.loading || store.receiptsLoading || store.outboundsLoading || store.locationsLoading }" />
          同步数据
        </Button>
      </div>
    </div>

    <Tabs v-model="activeTab" class="w-full flex-1 flex flex-col min-h-0">
      <TabsList class="grid w-full grid-cols-4 max-w-[720px]">
        <TabsTrigger value="inventory">物料库存</TabsTrigger>
        <TabsTrigger value="receipts">采购入库记录</TabsTrigger>
        <TabsTrigger value="outbounds">正式出库记录</TabsTrigger>
        <TabsTrigger value="locations">库位管理</TabsTrigger>
      </TabsList>

      <TabsContent value="inventory" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <CardTitle class="text-xs text-muted-foreground">低水位预警</CardTitle>
              <AlertCircle class="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold" :class="{ 'text-rose-600': store.lowStockItems.length > 0 }">{{ store.lowStockItems.length }}</div>
              <p class="text-xs text-muted-foreground mt-1">低于安全库存(需补货)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">启用库位</CardTitle>
              <MapPin class="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ store.activeLocations.length }}</div>
              <p class="text-xs text-muted-foreground mt-1">当前可用库位</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">已选出库物料</CardTitle>
              <Send class="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ selectedInventoryRows.length }}</div>
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
                @click="activeCategory = cat.id"
                class="px-3 py-1.5 text-sm rounded-sm transition-colors"
                :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
              >
                {{ cat.label }}
              </button>
            </div>

            <div class="grid gap-3 lg:grid-cols-[1.1fr_1.1fr_1.4fr_auto_auto_auto]">
              <select v-model="selectedWarehouseFilter" class="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">全部仓库</option>
                <option v-for="warehouse in store.warehouses" :key="warehouse.id" :value="String(warehouse.id)">
                  {{ warehouse.name }}
                </option>
              </select>
              <select v-model="selectedLocationFilter" class="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">全部库位</option>
                <option v-for="location in availableInventoryLocations" :key="location.id" :value="String(location.id)">
                  {{ location.name }} ({{ location.code }})
                </option>
              </select>
              <div class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="inventory-search"
                  aria-label="搜索物料"
                  v-model="searchQuery"
                  placeholder="搜索物料型号、供应商、编码..."
                  class="pl-10"
                />
              </div>
              <Button variant="outline" @click="lowStockOnly = !lowStockOnly">
                {{ lowStockOnly ? '仅看全部库存' : '仅看低库存' }}
              </Button>
              <Button variant="outline" @click="reconciliationOnly = !reconciliationOnly">
                {{ reconciliationOnly ? '显示全部库存' : '仅看对账异常' }}
              </Button>
              <Button @click="openOutboundDialog">
                <Send class="w-4 h-4 mr-2" />
                出库登记
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card class="flex-1 min-h-0">
          <CardContent class="p-4 h-full overflow-auto">
            <DataTable
              ref="inventoryTableRef"
              :columns="inventoryColumns"
              :data="filteredItems"
              :loading="store.loading"
              :enable-selection="true"
              :toolbar="false"
              density="compact"
              @selection-change="selectedInventoryRows = $event"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="receipts" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">记录总数</CardTitle>
              <ScrollText class="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ receiptSummary.count }}</div>
              <p class="text-xs text-muted-foreground mt-1">当前筛选记录数</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">涉及订单数</CardTitle>
              <Package class="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ receiptSummary.uniqueOrders }}</div>
              <p class="text-xs text-muted-foreground mt-1">覆盖的采购订单</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">累计入库</CardTitle>
              <Package class="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ receiptSummary.totalQuantity }}</div>
              <p class="text-xs text-muted-foreground mt-1">总计入库数量</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">净入库</CardTitle>
              <Package class="h-4 w-4 text-sky-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ receiptSummary.netQuantity }}</div>
              <p class="text-xs text-muted-foreground mt-1">扣除撤销后净值</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">最近入库</CardTitle>
              <ScrollText class="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ receiptSummary.latestReceiptDate }}</div>
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
                  v-model="receiptSearchQuery"
                  placeholder="搜索物料、操作人..."
                  class="pl-10"
                />
              </div>
              <div class="flex gap-2 flex-wrap flex-1 items-center">
                <Input
                  id="receipt-order-filter"
                  aria-label="按订单号筛选"
                  v-model="receiptOrderFilter"
                  placeholder="按订单号筛选"
                  class="w-full md:w-48"
                />
                <select id="receipt-direction-filter" aria-label="入库方向" v-model="receiptDirectionFilter" class="rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="ALL">全部方向</option>
                  <option value="in">仅入库</option>
                  <option value="reversal">仅撤销</option>
                </select>
                <select id="reverse-reason-filter" aria-label="撤销原因" v-model="reverseReasonFilter" class="rounded-md border bg-background px-3 py-2 text-sm">
                  <option v-for="option in availableReverseReasonOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
                <Button variant="outline" @click="handleExportReceipts">
                  <Download class="w-4 h-4 mr-2" />
                  导出
                </Button>
                <Button variant="outline" @click="clearReceiptOrderFilter" :disabled="!receiptOrderFilter && !receiptSearchQuery && receiptDirectionFilter === 'ALL' && reverseReasonFilter === 'ALL'">
                  清空筛选
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent class="p-4 pt-0 h-full overflow-auto flex flex-col min-h-[300px]">
            <p v-if="route.query.orderNo" class="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-3 py-2 mb-3">
              当前按采购订单 <span class="font-semibold">{{ route.query.orderNo }}</span> 定位入库记录
            </p>
            <div class="flex-1 min-h-0">
              <DataTable
                :columns="receiptColumns"
                :data="filteredReceipts"
                :loading="store.receiptsLoading"
                density="compact"
                empty-text="暂无采购入库记录"
              />
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
              <div>
                页码 {{ store.receiptsPage }} / {{ receiptTotalPages }}，共 {{ store.receiptsTotal }} 条
              </div>
              <div class="flex items-center gap-2">
                <select id="receipt-page-size" aria-label="每页条数" v-model="receiptPageSize" class="rounded-md border bg-background px-2 py-1 text-xs">
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
      </TabsContent>

      <TabsContent value="outbounds" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">出库单数</CardTitle>
              <Send class="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ outboundSummary.totalCount }}</div>
              <p class="text-xs text-muted-foreground mt-1">含冲销记录</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">涉及库位</CardTitle>
              <MapPin class="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ outboundSummary.totalLocations }}</div>
              <p class="text-xs text-muted-foreground mt-1">当前结果覆盖库位</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">累计出库</CardTitle>
              <Package class="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ outboundSummary.totalIssuedQuantity }}</div>
              <p class="text-xs text-muted-foreground mt-1">不含冲销回补</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">净出库</CardTitle>
              <Package class="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ outboundSummary.netQuantity }}</div>
              <p class="text-xs text-muted-foreground mt-1">扣除冲销后的净值</p>
            </CardContent>
          </Card>
        </div>

        <Card class="flex-1 min-h-0">
          <CardHeader class="flex flex-col gap-3">
            <div class="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_1fr_1fr]">
              <Input v-model="outboundNoFilter" placeholder="按出库单号筛选" />
              <div class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input v-model="outboundKeyword" placeholder="搜索物料、用途、库位..." class="pl-10" />
              </div>
              <Input v-model="outboundOperatorFilter" placeholder="按操作人筛选" />
              <select v-model="outboundWarehouseFilter" class="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">全部仓库</option>
                <option v-for="warehouse in store.warehouses" :key="warehouse.id" :value="String(warehouse.id)">
                  {{ warehouse.name }}
                </option>
              </select>
              <select v-model="outboundLocationFilter" class="h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">全部库位</option>
                <option v-for="location in availableOutboundLocations" :key="location.id" :value="String(location.id)">
                  {{ location.name }} ({{ location.code }})
                </option>
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              <Input v-model="outboundStartDate" type="date" class="w-full md:w-[180px]" />
              <Input v-model="outboundEndDate" type="date" class="w-full md:w-[180px]" />
              <Button variant="outline" @click="outboundNoFilter = ''; outboundKeyword = ''; outboundOperatorFilter = ''; outboundWarehouseFilter = ''; outboundLocationFilter = ''; outboundStartDate = ''; outboundEndDate = ''; outboundPage = 1;">
                清空筛选
              </Button>
            </div>
          </CardHeader>
          <CardContent class="p-4 pt-0 h-full overflow-auto flex flex-col min-h-[300px]">
            <div class="flex-1 min-h-0">
              <DataTable
                :columns="outboundColumns"
                :data="store.sortedOutbounds"
                :loading="store.outboundsLoading"
                density="compact"
                empty-text="暂无正式出库记录"
              />
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-muted-foreground shrink-0">
              <div>
                页码 {{ store.outboundsPage }} / {{ outboundTotalPages }}，共 {{ store.outboundsTotal }} 条
              </div>
              <div class="flex items-center gap-2">
                <select v-model="outboundPageSize" class="rounded-md border bg-background px-2 py-1 text-xs">
                  <option :value="20">20 / 页</option>
                  <option :value="50">50 / 页</option>
                  <option :value="100">100 / 页</option>
                </select>
                <Button variant="outline" size="sm" :disabled="store.outboundsPage <= 1 || store.outboundsLoading" @click="prevOutboundPage">
                  上一页
                </Button>
                <Button variant="outline" size="sm" :disabled="store.outboundsPage >= outboundTotalPages || store.outboundsLoading" @click="nextOutboundPage">
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="locations" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">仓库数</CardTitle>
              <Warehouse class="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ store.warehouses.length }}</div>
              <p class="text-xs text-muted-foreground mt-1">结构预留多仓扩展</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">全部库位</CardTitle>
              <MapPin class="h-4 w-4 text-cyan-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ store.locations.length }}</div>
              <p class="text-xs text-muted-foreground mt-1">含停用库位</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle class="text-xs text-muted-foreground">启用库位</CardTitle>
              <MapPin class="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div class="text-2xl font-semibold">{{ store.activeLocations.length }}</div>
              <p class="text-xs text-muted-foreground mt-1">当前可用于入库/出库</p>
            </CardContent>
          </Card>
        </div>

        <Card class="flex-1 min-h-0">
          <CardHeader class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div class="relative w-full md:w-[320px]">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input v-model="locationSearchQuery" placeholder="搜索仓库、库位编码或备注..." class="pl-10" />
            </div>
            <Button @click="openCreateLocationDialog">
              <MapPin class="w-4 h-4 mr-2" />
              新建库位
            </Button>
          </CardHeader>
          <CardContent class="p-4 pt-0 h-full overflow-auto">
            <DataTable
              :columns="locationColumns"
              :data="filteredLocations"
              :loading="store.locationsLoading"
              density="compact"
              empty-text="暂无库位配置"
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <InventoryOutboundDialog
      v-model:open="outboundDialogOpen"
      :saving="outboundSaving"
      :items="selectedInventoryRows"
      :warehouses="store.warehouses"
      :locations="store.activeLocations"
      @submit="handleSubmitOutbound"
    />

    <InventoryLocationDialog
      v-model:open="locationDialogOpen"
      :saving="locationDialogSaving"
      :warehouses="store.warehouses"
      :location="editingLocation"
      @submit="handleLocationSubmit"
    />

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
            <Button
              variant="outline"
              size="sm"
              class="ml-2"
              @click="router.push({ name: 'inventory-receipt-detail', params: { id: selectedReceiptAudit.original.id } }).catch(() => undefined)"
            >
              详情页
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
              <div class="text-xs text-muted-foreground">库位</div>
              <div class="mt-1 font-medium">{{ selectedReceiptAudit.original.location_name || selectedReceiptAudit.original.location_code || '-' }}</div>
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

    <Sheet :open="Boolean(selectedOutboundDetail)" @update:open="(open) => { if (!open) closeOutboundDetail(); }">
      <SheetContent side="right" class="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>出库单详情</SheetTitle>
          <SheetDescription>
            查看正式出库单明细及所在仓库、库位信息。
          </SheetDescription>
        </SheetHeader>
        <div v-if="selectedOutboundDetail" class="mt-6 space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">出库单号</div>
              <div class="mt-1 font-medium">{{ selectedOutboundDetail.outbound_no }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">库位</div>
              <div class="mt-1 font-medium">{{ selectedOutboundDetail.warehouse_name }} / {{ selectedOutboundDetail.location_name || selectedOutboundDetail.location_code }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">用途 / 原因</div>
              <div class="mt-1 font-medium">{{ selectedOutboundDetail.reason }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">操作人</div>
              <div class="mt-1 font-medium">{{ selectedOutboundDetail.operator || '-' }}</div>
            </div>
          </div>
          <div class="rounded-md border overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-muted/50">
                <tr class="text-left">
                  <th class="px-3 py-2 font-medium">物料</th>
                  <th class="px-3 py-2 font-medium">编码</th>
                  <th class="px-3 py-2 font-medium">数量</th>
                  <th class="px-3 py-2 font-medium">单位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in selectedOutboundDetail.items" :key="item.id" class="border-t">
                  <td class="px-3 py-2 font-medium">{{ item.item_name }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ item.material_code || item.material_id }}</td>
                  <td class="px-3 py-2">{{ item.quantity }}</td>
                  <td class="px-3 py-2">{{ item.unit || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            {{ selectedOutboundDetail.remark || '无额外备注' }}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <Sheet :open="Boolean(selectedMovementItem)" @update:open="(open) => { if (!open) closeMovementSheet(); }">
      <SheetContent side="right" class="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>库存影响轨迹</SheetTitle>
          <SheetDescription>
            查看单个物料最近的库存变动来源、库位余额和总库存结果。
          </SheetDescription>
        </SheetHeader>
        <div v-if="selectedMovementItem" class="mt-6 space-y-4">
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">物料</div>
              <div class="mt-1 font-medium">{{ selectedMovementItem.model || selectedMovementItem.name }}</div>
              <div class="text-xs text-muted-foreground mt-1">{{ selectedMovementItem.code }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">当前总库存</div>
              <div class="mt-1 font-medium">{{ selectedMovementItem.stock_quantity }} {{ selectedMovementItem.unit }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">最近 20 条净变动</div>
              <div class="mt-1 font-medium">{{ selectedMovementSummary?.netChange ?? 0 }} {{ selectedMovementItem.unit }}</div>
            </div>
            <div class="rounded-md border bg-muted/30 p-3">
              <div class="text-xs text-muted-foreground">最近动作时间</div>
              <div class="mt-1 font-medium">
                {{ selectedMovementSummary?.lastOccurredAt ? String(selectedMovementSummary.lastOccurredAt).slice(0, 19).replace('T', ' ') : '-' }}
              </div>
            </div>
          </div>
          <div class="rounded-md border">
            <div class="grid gap-3 border-b bg-muted/20 px-4 py-3 text-xs font-medium text-muted-foreground md:grid-cols-[150px_110px_130px_1fr_120px_120px]">
              <div>发生时间</div>
              <div>变动类型</div>
              <div>库位</div>
              <div>原因/备注</div>
              <div>数量变化</div>
              <div>变更后库存</div>
            </div>
            <div v-if="store.movementsLoading" class="px-4 py-6 text-sm text-muted-foreground">
              正在加载库存轨迹...
            </div>
            <div v-else-if="store.sortedMovements.length === 0" class="px-4 py-6 text-sm text-muted-foreground">
              暂无库存轨迹记录。
            </div>
            <div v-else class="divide-y">
              <div
                v-for="movement in store.sortedMovements"
                :key="movement.id"
                class="grid gap-3 px-4 py-3 text-sm md:grid-cols-[150px_110px_130px_1fr_120px_120px]"
              >
                <div>{{ String(movement.occurred_at || movement.created_at || '-').slice(0, 19).replace('T', ' ') }}</div>
                <div>{{ formatMovementSourceLabel(movement.source_type) }}</div>
                <div>{{ movement.location_name || movement.location_code || '-' }}</div>
                <div class="text-muted-foreground">
                  <div class="font-medium text-foreground">{{ movement.reason || '-' }}</div>
                  <div class="text-xs mt-1">{{ movement.remark || movement.operator || '-' }}</div>
                </div>
                <div :class="Number(movement.delta_quantity || 0) >= 0 ? 'font-medium text-emerald-600' : 'font-medium text-rose-600'">
                  {{ Number(movement.delta_quantity || 0) > 0 ? '+' : '' }}{{ movement.delta_quantity }}
                </div>
                <div>
                  <div>总库存 {{ movement.stock_after }}</div>
                  <div class="text-xs text-muted-foreground mt-1">库位 {{ movement.balance_after }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="text-xs text-muted-foreground">
            当前仅展示最近 {{ store.movementsPageSize }} 条轨迹，共 {{ selectedMovementSummary?.total ?? 0 }} 条。
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
        <div v-if="reverseReceiptTarget" class="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-3">
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
        <div class="block space-y-1 text-sm">
          <label for="reverse-reason" class="text-foreground">撤销原因</label>
          <select id="reverse-reason" v-model="reverseReason" class="w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option v-for="option in reverseReasonOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="block space-y-1 text-sm">
          <label for="reverse-quantity" class="text-foreground">本次撤销数量</label>
          <div class="flex items-center gap-2">
            <Input
              id="reverse-quantity"
              v-model="reverseQuantity"
              type="number"
              min="0"
              :max="String(reverseReceiptTarget?.reversible_quantity || 0)"
              step="0.01"
            />
            <Button variant="outline" type="button" @click="reverseQuantity = String(reverseReceiptTarget?.reversible_quantity || '')">
              全部撤销
            </Button>
          </div>
        </div>
        <div class="block space-y-1 text-sm">
          <label for="reverse-remark" class="text-foreground">备注</label>
          <Textarea id="reverse-remark" v-model="reverseRemark" rows="2" placeholder="可选，补充说明本次撤销动作" />
        </div>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      v-model:open="reverseOutboundDialogOpen"
      title="确认冲销出库"
      confirm-text="确认冲销"
      cancel-text="取消"
      variant="warning"
      :loading="reversingOutbound"
      @confirm="confirmReverseOutbound"
    >
      <div class="space-y-3">
        <p class="text-sm text-muted-foreground">
          <span v-if="reverseOutboundTarget">
            出库单 <span class="font-medium text-foreground">{{ reverseOutboundTarget.outbound_no }}</span>
            将按原库位回补库存。
          </span>
        </p>
        <div v-if="reverseOutboundTarget" class="grid gap-2 rounded-md border bg-muted/30 p-3 text-sm md:grid-cols-2">
          <div>
            <div class="text-xs text-muted-foreground">仓库 / 库位</div>
            <div class="font-medium">{{ reverseOutboundTarget.warehouse_name }} / {{ reverseOutboundTarget.location_name || reverseOutboundTarget.location_code }}</div>
          </div>
          <div>
            <div class="text-xs text-muted-foreground">物料条数</div>
            <div class="font-medium">{{ reverseOutboundTarget.items.length }}</div>
          </div>
        </div>
        <div class="block space-y-1 text-sm">
          <label for="reverse-outbound-reason" class="text-foreground">冲销原因</label>
          <Input id="reverse-outbound-reason" v-model="reverseOutboundReason" placeholder="例如：误领料 / 错误登记" />
        </div>
        <div class="block space-y-1 text-sm">
          <label for="reverse-outbound-remark" class="text-foreground">备注</label>
          <Textarea id="reverse-outbound-remark" v-model="reverseOutboundRemark" rows="2" placeholder="可选，补充说明本次冲销动作" />
        </div>
      </div>
    </ConfirmDialog>
  </div>
</template>
