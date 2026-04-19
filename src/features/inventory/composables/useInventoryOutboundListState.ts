import { watch, type Ref } from 'vue';
import type { InventoryLocation, InventoryOutbound } from '@/types/inventory';

export function useInventoryOutboundListState(options: {
  fetchInventoryOutbounds: (params: {
    outboundNo?: string;
    keyword?: string;
    operator?: string;
    warehouseId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => Promise<void>;
  fetchAllInventoryOutbounds: (params: {
    outboundNo?: string;
    keyword?: string;
    operator?: string;
    warehouseId?: string;
    locationId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<InventoryOutbound[]>;
  exportOutboundsToCSV: (rows: InventoryOutbound[]) => void;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
  outboundNoFilter: Ref<string>;
  debouncedOutboundKeyword: Ref<string>;
  outboundOperatorFilter: Ref<string>;
  outboundWarehouseFilter: Ref<string>;
  outboundLocationFilter: Ref<string>;
  outboundStartDate: Ref<string>;
  outboundEndDate: Ref<string>;
  outboundPage: Ref<number>;
  outboundPageSize: Ref<number>;
  outboundTotalPages: Ref<number>;
  availableOutboundLocations: Ref<InventoryLocation[]>;
}) {
  async function loadOutbounds() {
    try {
      await options.fetchInventoryOutbounds({
        outboundNo: options.outboundNoFilter.value.trim() || undefined,
        keyword: options.debouncedOutboundKeyword.value.trim() || undefined,
        operator: options.outboundOperatorFilter.value.trim() || undefined,
        warehouseId: options.outboundWarehouseFilter.value || undefined,
        locationId: options.outboundLocationFilter.value || undefined,
        startDate: options.outboundStartDate.value || undefined,
        endDate: options.outboundEndDate.value || undefined,
        page: options.outboundPage.value,
        pageSize: options.outboundPageSize.value,
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
    options.fetchAllInventoryOutbounds({
      outboundNo: options.outboundNoFilter.value.trim() || undefined,
      keyword: options.debouncedOutboundKeyword.value.trim() || undefined,
      operator: options.outboundOperatorFilter.value.trim() || undefined,
      warehouseId: options.outboundWarehouseFilter.value || undefined,
      locationId: options.outboundLocationFilter.value || undefined,
      startDate: options.outboundStartDate.value || undefined,
      endDate: options.outboundEndDate.value || undefined,
    }).then((rows) => {
      if (rows.length === 0) {
        options.toast({
          title: '暂无可导出的出库记录',
          variant: 'destructive',
        });
        return;
      }

      options.exportOutboundsToCSV(rows);
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

  function nextOutboundPage() {
    if (options.outboundPage.value >= options.outboundTotalPages.value) return;
    options.outboundPage.value += 1;
  }

  function prevOutboundPage() {
    if (options.outboundPage.value <= 1) return;
    options.outboundPage.value -= 1;
  }

  watch(options.outboundWarehouseFilter, (warehouseId) => {
    if (!warehouseId) {
      options.outboundLocationFilter.value = '';
      return;
    }
    const valid = options.availableOutboundLocations.value.some((location) => location.id === Number(options.outboundLocationFilter.value));
    if (!valid) {
      options.outboundLocationFilter.value = '';
    }
  });

  watch(
    [
      options.outboundNoFilter,
      options.debouncedOutboundKeyword,
      options.outboundOperatorFilter,
      options.outboundWarehouseFilter,
      options.outboundLocationFilter,
      options.outboundStartDate,
      options.outboundEndDate,
    ],
    () => {
      options.outboundPage.value = 1;
      void loadOutbounds();
    },
  );

  watch([options.outboundPage, options.outboundPageSize], () => {
    void loadOutbounds();
  });

  return {
    loadOutbounds,
    handleExportOutbounds,
    nextOutboundPage,
    prevOutboundPage,
  };
}
