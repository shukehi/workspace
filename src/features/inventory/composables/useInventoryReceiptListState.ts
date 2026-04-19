import { computed, type Ref } from 'vue';
import type { InventoryReceipt } from '@/types/inventory';

export function useInventoryReceiptListState(options: {
  sortedReceipts: () => InventoryReceipt[];
  receiptsTotal: () => number;
  receiptsPageSize: () => number;
  receiptPage: Ref<number>;
  fetchInventoryReceipts: (params: Record<string, unknown>) => Promise<void>;
  fetchAllInventoryReceipts: (params: Record<string, unknown>) => Promise<InventoryReceipt[]>;
  exportReceiptsToCSV: (rows: InventoryReceipt[]) => void;
  buildReceiptFetchParams: (orderNo?: string) => Record<string, unknown>;
  reconcileReceiptAudit: () => void;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
  getRouteOrderNo: () => string;
  getRouteKeyword: () => string;
  getRouteDirection: () => string;
  getRouteReverseReason: () => string;
}) {
  const filteredReceipts = computed(() => options.sortedReceipts());

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

  const receiptTotalPages = computed(() => Math.max(1, Math.ceil((options.receiptsTotal() || 0) / (options.receiptsPageSize() || 50))));

  async function loadReceipts(orderNo = '') {
    try {
      await options.fetchInventoryReceipts(options.buildReceiptFetchParams(orderNo));
      options.reconcileReceiptAudit();
    } catch {
      options.toast({
        title: '入库记录加载失败',
        description: '无法获取最新采购入库记录，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function nextReceiptPage() {
    if (options.receiptPage.value >= receiptTotalPages.value) return;
    options.receiptPage.value += 1;
  }

  function prevReceiptPage() {
    if (options.receiptPage.value <= 1) return;
    options.receiptPage.value -= 1;
  }

  function handleExportReceipts() {
    const orderNo = options.getRouteOrderNo();
    const keyword = options.getRouteKeyword();
    const direction = options.getRouteDirection();
    const reverseReasonQuery = options.getRouteReverseReason();

    options.fetchAllInventoryReceipts({
      ...(orderNo ? { orderNo } : {}),
      ...(keyword ? { keyword } : {}),
      ...(direction ? { direction: direction as 'in' | 'reversal' } : {}),
      ...(reverseReasonQuery ? { reverseReason: reverseReasonQuery } : {}),
    }).then((rows) => {
      if (rows.length === 0) {
        options.toast({
          title: '暂无可导出的入库记录',
          variant: 'destructive',
        });
        return;
      }

      options.exportReceiptsToCSV(rows);
      options.toast({
        title: '导出成功',
        description: `已导出 ${rows.length} 条采购入库记录`,
        variant: 'success',
      });
    }).catch(() => {
      options.toast({
        title: '导出失败',
        description: '无法获取完整的采购入库记录，请稍后重试',
        variant: 'destructive',
      });
    });
  }

  return {
    filteredReceipts,
    receiptSummary,
    receiptTotalPages,
    loadReceipts,
    nextReceiptPage,
    prevReceiptPage,
    handleExportReceipts,
  };
}
