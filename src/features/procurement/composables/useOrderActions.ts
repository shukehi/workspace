import { ref } from 'vue';
import { api } from '@/lib/api';
import type { Order } from '@/types/order';
import { ORDER_STATUS_LABELS } from '@/shared/constants/order';
import { validateForPrinting, buildPrintPayload } from '../orderRules';
import { buildPurchaseOrderPdfFilename } from '../pdfFilename';

export type OrderActionOptions = {
  toast: (payload: { title: string; description?: string; variant?: 'default' | 'destructive' | 'success' }) => void;
  onRefresh?: () => Promise<void>;
  onClearSelection?: () => void;
};

export function useOrderActions(options: OrderActionOptions) {
  const isActionInProgress = ref(false);

  /**
   * 状态更新逻辑封装
   */
  async function updateStatus(order: Order, status: Order['status']) {
    try {
      isActionInProgress.value = true;
      await api.put(`/orders/${order.id}/status`, { status });
      await options.onRefresh?.();
      options.toast({
        title: '状态更新成功',
        description: `订单 ${order.order_no} 已设为 ${ORDER_STATUS_LABELS[status] || status}`,
        variant: 'success'
      });
    } catch (e: any) {
      options.toast({
        title: '更新失败',
        description: e?.message || '无法更新订单状态',
        variant: 'destructive'
      });
    } finally {
      isActionInProgress.value = false;
    }
  }

  /**
   * 打印/导出通用快照创建
   */
  async function createSnapshot(order: Order, printMode: string = 'signature') {
    const payload = buildPrintPayload(order, printMode);
    const result = await api.post<{ snapshotId?: string }>('/print/snapshots', payload);
    const snapshotId = String(result?.snapshotId || '').trim();
    if (!snapshotId) {
      throw new Error('快照创建失败');
    }
    return snapshotId;
  }

  /**
   * 执行打印
   */
  async function performPrint(order: Order, printMode: string = 'signature') {
    const validation = validateForPrinting(order);
    if (!validation.canProceed) return;
    if (validation.needsConfirm && !window.confirm(validation.message)) return;

    try {
      const id = await createSnapshot(order, printMode);
      window.open(
        `/print-document?snapshotId=${encodeURIComponent(id)}&printMode=${printMode}&autoPrint=1&t=${Date.now()}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (e: any) {
      console.error('Print failed', e);
      options.toast({ title: '打印失败', description: '无法生成打印快照', variant: 'destructive' });
    }
  }

  /**
   * 导出 PDF
   */
  async function performExportPdf(order: Order, printMode: string = 'signature') {
    const validation = validateForPrinting(order);
    if (!validation.canProceed) return;
    if (validation.needsConfirm && !window.confirm(validation.message)) return;

    try {
      isActionInProgress.value = true;
      const filename = buildPurchaseOrderPdfFilename(order);
      const id = await createSnapshot(order, printMode);
      await api.downloadPDF('/pdf/generate', {
        poNumber: order.order_no,
        snapshotId: id,
        printMode,
      }, filename);

      options.toast({
        title: '导出成功',
        description: `已导出 ${filename}`,
        variant: 'success'
      });
    } catch (e: any) {
      console.error('Export PDF failed', e);
      options.toast({ title: '导出失败', description: '无法生成 PDF 文件', variant: 'destructive' });
    } finally {
      isActionInProgress.value = false;
    }
  }

  /**
   * 到货登记
   */
  async function markArrived(order: Order) {
    try {
      isActionInProgress.value = true;
      await api.put(`/orders/${order.id}/mark-arrived`, {
        arrived_at: new Date().toISOString(),
      });
      await options.onRefresh?.();
      options.toast({
        title: '到货登记成功',
        description: `订单 ${order.order_no} 已设为到货`,
        variant: 'success'
      });
    } catch (e: any) {
      options.toast({
        title: '登记失败',
        description: e?.message || '无法登记到货状态',
        variant: 'destructive'
      });
    } finally {
      isActionInProgress.value = false;
    }
  }

  return {
    isActionInProgress,
    updateStatus,
    performPrint,
    performExportPdf,
    markArrived
  };
}
