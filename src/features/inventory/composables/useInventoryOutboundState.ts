import { computed, ref, watch, type Ref } from 'vue';
import { refDebounced } from '@vueuse/core';
import { useInventoryStore } from '@/stores/useInventoryStore';
import type { InventoryItem, InventoryLocation, InventoryOutbound } from '@/types/inventory';
import type { InventoryOutboundPayload } from '@/features/inventory/inventoryStoreFlows';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type InventoryStore = ReturnType<typeof useInventoryStore>;

export type InventoryOutboundReverseControls = {
  reverseOutboundDialogOpen: Ref<boolean>;
  reverseOutboundTarget: Ref<InventoryOutbound | null>;
  reverseOutboundReason: Ref<string>;
  reverseOutboundRemark: Ref<string>;
  reversingOutbound: Ref<boolean>;
  confirmReverseOutbound: () => Promise<void>;
};

export function useInventoryOutboundState(options: {
  store: InventoryStore;
  toast: ToastFn;
  selectedInventoryRows: Ref<InventoryItem[]>;
  clearInventorySelection: () => void;
  refreshInventory: () => Promise<void>;
}) {
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

  const availableOutboundLocations = computed(() => {
    const warehouseId = Number(outboundWarehouseFilter.value);
    const base = options.store.activeLocations;
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) return base;
    return base.filter((location) => location.warehouse_id === warehouseId);
  });

  const outboundSummary = computed(() => {
    const list = options.store.sortedOutbounds;
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

  const outboundTotalPages = computed(() => Math.max(1, Math.ceil((options.store.outboundsTotal || 0) / (options.store.outboundsPageSize || 50))));

  async function loadOutbounds() {
    try {
      await options.store.fetchInventoryOutbounds({
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
      options.toast({
        title: '出库记录加载失败',
        description: '无法获取最新出库流水，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function handleExportOutbounds() {
    options.store.fetchAllInventoryOutbounds({
      outboundNo: outboundNoFilter.value.trim() || undefined,
      keyword: debouncedOutboundKeyword.value.trim() || undefined,
      operator: outboundOperatorFilter.value.trim() || undefined,
      warehouseId: outboundWarehouseFilter.value || undefined,
      locationId: outboundLocationFilter.value || undefined,
      startDate: outboundStartDate.value || undefined,
      endDate: outboundEndDate.value || undefined,
    }).then((rows) => {
      if (rows.length === 0) {
        options.toast({
          title: '暂无可导出的出库记录',
          variant: 'destructive',
        });
        return;
      }

      options.store.exportOutboundsToCSV(rows);
      options.toast({
        title: '导出成功',
        description: `已导出 ${rows.length} 张正式出库单`,
        variant: 'success',
      });
    }).catch(() => {
      options.toast({
        title: '导出失败',
        description: '无法获取完整的正式出库记录，请稍后重试',
        variant: 'destructive',
      });
    });
  }

  function requestReverseOutbound(outbound: InventoryOutbound) {
    reverseOutboundTarget.value = outbound;
    reverseOutboundReason.value = '出库冲销';
    reverseOutboundRemark.value = '';
    reverseOutboundDialogOpen.value = true;
  }

  function openOutboundDialog() {
    if (options.selectedInventoryRows.value.length === 0) {
      options.toast({
        title: '请先勾选物料',
        description: '至少选择一项库存物料后才能登记出库',
        variant: 'destructive',
      });
      return;
    }
    outboundDialogOpen.value = true;
  }

  async function handleSubmitOutbound(payload: InventoryOutboundPayload) {
    outboundSaving.value = true;
    try {
      await options.store.createInventoryOutbound(payload);
      outboundDialogOpen.value = false;
      options.clearInventorySelection();
      await Promise.all([options.refreshInventory(), loadOutbounds()]);
      options.toast({
        title: '出库登记成功',
        description: `已生成 ${payload.items.length} 条出库明细`,
        variant: 'success',
      });
    } catch {
      options.toast({
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
      await options.store.reverseInventoryOutbound(reverseOutboundTarget.value.id, {
        reason: reverseOutboundReason.value.trim() || '出库冲销',
        remark: reverseOutboundRemark.value.trim() || undefined,
        outbound_date: new Date().toISOString(),
      });
      reverseOutboundDialogOpen.value = false;
      reverseOutboundTarget.value = null;
      reverseOutboundReason.value = '出库冲销';
      reverseOutboundRemark.value = '';
      await Promise.all([options.refreshInventory(), loadOutbounds()]);
      options.toast({
        title: '出库冲销成功',
        description: '已恢复对应库位余额和总库存',
        variant: 'success',
      });
    } catch {
      options.toast({
        title: '出库冲销失败',
        description: '当前出库单可能已冲销或库存数据异常',
        variant: 'destructive',
      });
    } finally {
      reversingOutbound.value = false;
    }
  }

  function nextOutboundPage() {
    if (outboundPage.value >= outboundTotalPages.value) return;
    outboundPage.value += 1;
  }

  function prevOutboundPage() {
    if (outboundPage.value <= 1) return;
    outboundPage.value -= 1;
  }

  async function openOutboundDetail(outbound: InventoryOutbound) {
    selectedOutboundDetail.value = await options.store.fetchInventoryOutbound(outbound.id);
  }

  function closeOutboundDetail() {
    selectedOutboundDetail.value = null;
  }

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

  return {
    outboundDialogOpen,
    outboundSaving,
    outboundNoFilter,
    outboundKeyword,
    debouncedOutboundKeyword,
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
    requestReverseOutbound,
    openOutboundDialog,
    handleSubmitOutbound,
    confirmReverseOutbound,
    nextOutboundPage,
    prevOutboundPage,
    openOutboundDetail,
    closeOutboundDetail,
  };
}
