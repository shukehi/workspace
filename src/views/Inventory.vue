<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useInventoryStore } from '@/stores/useInventoryStore';
import { useToastStore } from '@/stores/useToastStore';
import { useInventoryPageState } from '@/features/inventory/composables/useInventoryPageState';
import { useInventoryOutboundState } from '@/features/inventory/composables/useInventoryOutboundState';
import { useInventoryLocationQueryState } from '@/features/inventory/composables/useInventoryLocationQueryState';
import { useInventoryLocationDialogState } from '@/features/inventory/composables/useInventoryLocationDialogState';
import { useInventoryReceiptAuditState } from '@/features/inventory/composables/useInventoryReceiptAuditState';
import { useInventoryReceiptReverseState } from '@/features/inventory/composables/useInventoryReceiptReverseState';
import { useInventoryReceiptRouteState } from '@/features/inventory/composables/useInventoryReceiptRouteState';
import InventoryStockTab from '@/features/inventory/components/InventoryStockTab.vue';
import InventoryReceiptsTab from '@/features/inventory/components/InventoryReceiptsTab.vue';
import InventoryOutboundsTab from '@/features/inventory/components/InventoryOutboundsTab.vue';
import InventoryLocationsTab from '@/features/inventory/components/InventoryLocationsTab.vue';
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
import { Download, RefreshCcw } from 'lucide-vue-next';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import type { InventoryItem, InventoryLocation, InventoryMovement, InventoryOutbound, InventoryReceipt } from '@/types/inventory';

const PROCUREMENT_REFRESH_SIGNAL_KEY = 'procurement-orders-refresh-signal';

const store = useInventoryStore();
const { toast } = useToastStore();
const route = useRoute();
const router = useRouter();

const activeTab = ref(String(route.query.tab || (route.query.orderNo ? 'receipts' : 'inventory')));
const inventoryTableRef = ref<any>(null);

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

const {
  activeCategory,
  searchQuery,
  selectedWarehouseFilter,
  selectedLocationFilter,
  lowStockOnly,
  reconciliationOnly,
  selectedInventoryRows,
  selectedMovementItem,
  availableInventoryLocations,
  filteredItems,
  reconciliationSummary,
  selectedMovementSummary,
  formatMovementSourceLabel,
  loadInventoryList,
  handleExportInventory,
  handleExportReconciliation,
  openMovementSheet,
  closeMovementSheet,
} = useInventoryPageState({
  store,
  toast,
  initialWarehouseId: String(route.query.warehouseId || ''),
  initialLocationId: String(route.query.locationId || ''),
  initialLowStockOnly: String(route.query.lowStockOnly || '').toLowerCase() === 'true',
});

const filteredReceipts = computed(() => store.sortedReceipts);

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
const {
  outboundDialogOpen,
  outboundSaving,
  outboundNoFilter,
  outboundKeyword,
  outboundOperatorFilter,
  outboundWarehouseFilter,
  outboundLocationFilter,
  outboundStartDate,
  outboundEndDate,
  outboundPage,
  outboundPageSize,
  selectedOutboundDetail,
  reverseOutboundDialogOpen,
  reverseOutboundTarget,
  reverseOutboundReason,
  reverseOutboundRemark,
  reversingOutbound,
  availableOutboundLocations,
  outboundSummary,
  outboundTotalPages,
  loadOutbounds,
  handleExportOutbounds,
  requestReverseOutbound: handleRequestReverseOutbound,
  openOutboundDialog,
  handleSubmitOutbound,
  confirmReverseOutbound,
  nextOutboundPage,
  prevOutboundPage,
  openOutboundDetail: handleOpenOutboundDetail,
  closeOutboundDetail,
} = useInventoryOutboundState({
  store,
  toast,
  selectedInventoryRows,
  clearInventorySelection: () => {
    selectedInventoryRows.value = [];
    inventoryTableRef.value?.clearSelection?.();
  },
  refreshInventory: () => loadInventoryList(),
});

const {
  locationSearchQuery,
  filteredLocations,
} = useInventoryLocationQueryState({
  locations: () => store.locations,
});

const {
  locationDialogOpen,
  locationDialogSaving,
  editingLocation,
  handleLocationSubmit,
  openCreateLocationDialog,
  openEditLocationDialog,
} = useInventoryLocationDialogState({
  createInventoryLocation: store.createInventoryLocation,
  updateInventoryLocation: store.updateInventoryLocation,
  fetchInventoryLocations: store.fetchInventoryLocations,
  toast,
});

const availableReverseReasonOptions = computed(() => {
  return [
    { value: 'ALL', label: '全部原因' },
    ...reverseReasonOptions,
  ];
});

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
    await handleOpenOutboundDetail(outbound);
  },
  onReverse: (outbound) => {
    handleRequestReverseOutbound(outbound);
  },
});
const locationColumns = createInventoryLocationColumns({
  onEdit: (location) => {
    openEditLocationDialog(location);
  },
});

function isReceiptReversible(receipt: InventoryReceipt) {
  return receipt.direction !== 'reversal' && Number(receipt.reversible_quantity || 0) > 0;
}

const {
  auditReceiptId,
  auditRows,
  selectedReceiptAudit,
  openReceiptAudit,
  closeReceiptAudit,
  reconcileReceiptAudit,
} = useInventoryReceiptAuditState({
  receipts: () => store.receipts,
  fetchAllInventoryReceipts: store.fetchAllInventoryReceipts,
  toast,
});

const {
  reverseDialogOpen,
  reverseReceiptTarget,
  reverseReason,
  reverseRemark,
  reverseQuantity,
  reversing,
  requestReverseReceipt,
  resetReceiptReverseQuantityToMax: resetReceiptReverseQuantity,
  confirmReverseReceipt,
} = useInventoryReceiptReverseState({
  reverseReceipt: store.reverseReceipt,
  loadReceipts: (orderNo = '') => loadReceipts(orderNo),
  reloadInventory: () => loadInventoryList(),
  notifyProcurementRefresh: () => {
    window.localStorage.setItem(PROCUREMENT_REFRESH_SIGNAL_KEY, String(Date.now()));
  },
  onReversed: () => {
    auditRows.value = [];
  },
  toast,
});

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
        <InventoryStockTab
          :total-items="store.items.length"
          :low-stock-count="store.lowStockItems.length"
          :active-locations-count="store.activeLocations.length"
          :selected-inventory-rows-count="selectedInventoryRows.length"
          :reconciliation-summary="reconciliationSummary"
          :categories="categories"
          :active-category="activeCategory"
          :warehouses="store.warehouses"
          :available-locations="availableInventoryLocations"
          :selected-warehouse-filter="selectedWarehouseFilter"
          :selected-location-filter="selectedLocationFilter"
          :search-query="searchQuery"
          :low-stock-only="lowStockOnly"
          :reconciliation-only="reconciliationOnly"
          :columns="inventoryColumns"
          :rows="filteredItems"
          :loading="store.loading"
          @update:active-category="activeCategory = $event"
          @update:selected-warehouse-filter="selectedWarehouseFilter = $event"
          @update:selected-location-filter="selectedLocationFilter = $event"
          @update:search-query="searchQuery = $event"
          @update:low-stock-only="lowStockOnly = $event"
          @update:reconciliation-only="reconciliationOnly = $event"
          @selection-change="selectedInventoryRows = $event"
          @export-reconciliation="handleExportReconciliation"
          @open-outbound-dialog="openOutboundDialog"
        />
      </TabsContent>

      <TabsContent value="receipts" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <InventoryReceiptsTab
          :summary="receiptSummary"
          :receipt-search-query="receiptSearchQuery"
          :receipt-order-filter="receiptOrderFilter"
          :receipt-direction-filter="receiptDirectionFilter"
          :reverse-reason-filter="reverseReasonFilter"
          :available-reverse-reason-options="availableReverseReasonOptions"
          :columns="receiptColumns"
          :rows="filteredReceipts"
          :loading="store.receiptsLoading"
          :page="store.receiptsPage"
          :total-pages="receiptTotalPages"
          :total="store.receiptsTotal"
          :page-size="receiptPageSize"
          :order-no-query="String(route.query.orderNo || '')"
          @update:receipt-search-query="receiptSearchQuery = $event"
          @update:receipt-order-filter="receiptOrderFilter = $event"
          @update:receipt-direction-filter="receiptDirectionFilter = $event as 'ALL' | 'in' | 'reversal'"
          @update:reverse-reason-filter="reverseReasonFilter = $event"
          @update:receipt-page-size="receiptPageSize = $event"
          @export="handleExportReceipts"
          @clear-filters="clearReceiptOrderFilter"
          @prev-page="prevReceiptPage"
          @next-page="nextReceiptPage"
        />
      </TabsContent>

      <TabsContent value="outbounds" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <InventoryOutboundsTab
          :summary="outboundSummary"
          :warehouses="store.warehouses"
          :available-locations="availableOutboundLocations"
          :outbound-no-filter="outboundNoFilter"
          :outbound-keyword="outboundKeyword"
          :outbound-operator-filter="outboundOperatorFilter"
          :outbound-warehouse-filter="outboundWarehouseFilter"
          :outbound-location-filter="outboundLocationFilter"
          :outbound-start-date="outboundStartDate"
          :outbound-end-date="outboundEndDate"
          :outbound-page-size="outboundPageSize"
          :outbound-total-pages="outboundTotalPages"
          :columns="outboundColumns"
          :rows="store.sortedOutbounds"
          :loading="store.outboundsLoading"
          :page="store.outboundsPage"
          :total="store.outboundsTotal"
          @update:outbound-no-filter="outboundNoFilter = $event"
          @update:outbound-keyword="outboundKeyword = $event"
          @update:outbound-operator-filter="outboundOperatorFilter = $event"
          @update:outbound-warehouse-filter="outboundWarehouseFilter = $event"
          @update:outbound-location-filter="outboundLocationFilter = $event"
          @update:outbound-start-date="outboundStartDate = $event"
          @update:outbound-end-date="outboundEndDate = $event"
          @update:outbound-page-size="outboundPageSize = $event"
          @clear-filters="outboundNoFilter = ''; outboundKeyword = ''; outboundOperatorFilter = ''; outboundWarehouseFilter = ''; outboundLocationFilter = ''; outboundStartDate = ''; outboundEndDate = ''; outboundPage = 1;"
          @prev-page="prevOutboundPage"
          @next-page="nextOutboundPage"
        />
      </TabsContent>

      <TabsContent value="locations" class="flex-1 min-h-0 flex flex-col gap-4 mt-4 data-[state=active]:flex">
        <InventoryLocationsTab
          :warehouse-count="store.warehouses.length"
          :locations-count="store.locations.length"
          :active-locations-count="store.activeLocations.length"
          :location-search-query="locationSearchQuery"
          :columns="locationColumns"
          :rows="filteredLocations"
          :loading="store.locationsLoading"
          @update:location-search-query="locationSearchQuery = $event"
          @create-location="openCreateLocationDialog"
        />
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
            <Button variant="outline" type="button" @click="resetReceiptReverseQuantity">
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
