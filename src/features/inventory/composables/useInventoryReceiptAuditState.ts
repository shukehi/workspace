import { computed, ref } from 'vue';
import type { InventoryReceipt } from '@/types/inventory';

export type InventoryReceiptAuditState = {
  original: InventoryReceipt;
  reversals: InventoryReceipt[];
  netQuantity: number;
};

export function useInventoryReceiptAuditState(options: {
  receipts: () => InventoryReceipt[];
  fetchAllInventoryReceipts: (params: { orderNo?: string; orderId?: number | string }) => Promise<InventoryReceipt[]>;
  toast: (payload: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success';
  }) => void;
}) {
  const auditReceiptId = ref<number | null>(null);
  const auditRows = ref<InventoryReceipt[]>([]);

  const selectedReceiptAudit = computed<InventoryReceiptAuditState | null>(() => {
    if (!auditReceiptId.value) return null;

    const source = auditRows.value.length > 0 ? auditRows.value : options.receipts();
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
      netQuantity,
    };
  });

  async function openReceiptAudit(receipt: InventoryReceipt) {
    const originalId = receipt.direction === 'reversal'
      ? Number(receipt.source_receipt_id || 0)
      : Number(receipt.id);
    auditReceiptId.value = originalId;

    try {
      auditRows.value = await options.fetchAllInventoryReceipts({
        orderId: receipt.order_id,
      });
    } catch {
      auditRows.value = [];
      options.toast({
        title: '轨迹加载失败',
        description: '无法获取完整的入库撤销轨迹，请稍后重试',
        variant: 'destructive',
      });
    }
  }

  function closeReceiptAudit() {
    auditReceiptId.value = null;
    auditRows.value = [];
  }

  function reconcileReceiptAudit() {
    if (auditReceiptId.value && !selectedReceiptAudit.value) {
      closeReceiptAudit();
    }
  }

  return {
    auditReceiptId,
    auditRows,
    selectedReceiptAudit,
    openReceiptAudit,
    closeReceiptAudit,
    reconcileReceiptAudit,
  };
}
