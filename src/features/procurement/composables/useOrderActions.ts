import { ref } from 'vue';
import { api } from '@/lib/api';
import type { Order } from '@/types/order';
import { ORDER_STATUS_LABELS } from '@/shared/constants/order';
import { validateForPrinting, buildPrintPayload } from '../orderRules';
import { buildPurchaseOrderPdfFilename } from '../pdfFilename';

type ApiClient = {
  post: <T = unknown>(url: string, data?: unknown) => Promise<T>;
  put?: (url: string, data?: unknown) => Promise<unknown>;
  postBlob?: (url: string, data?: unknown) => Promise<Blob>;
  downloadPDF: (url: string, data: unknown, filename: string) => Promise<void>;
};

type BrowserClipboardItemCtor = new (
  items: Record<string, Blob | string | PromiseLike<Blob | string>>,
  options?: ClipboardItemOptions
) => ClipboardItem;

type BrowserClipboard = {
  write?: (data: ClipboardItem[]) => Promise<void>;
  writeText?: (data: string) => Promise<void>;
};

type BrowserEnv = {
  confirm: (message?: string) => boolean;
  open: (url?: string | URL, target?: string, features?: string) => Window | null;
  clipboard?: BrowserClipboard;
  ClipboardItem?: BrowserClipboardItemCtor;
};

export type OrderActionOptions = {
  toast: (payload: { title: string; description?: string; variant?: 'default' | 'destructive' | 'success' }) => void;
  onRefresh?: () => Promise<void>;
  onClearSelection?: () => void;
  /** Injected API client (for tests). Falls back to the global `api` module. */
  apiClient?: ApiClient;
  /** Injected browser env (for tests). Falls back to `window`. */
  browser?: BrowserEnv;
};

export function useOrderActions(options: OrderActionOptions) {
  const isActionInProgress = ref(false);

  // Resolve injected or real deps
  const apiClient: ApiClient = options.apiClient ?? {
    post: (url, data) => api.post(url, data) as Promise<any>,
    put: (url, data) => api.put(url, data) as Promise<any>,
    postBlob: (url, data) => api.postBlob(url, data),
    downloadPDF: (url, data, filename) => api.downloadPDF(url, data, filename),
  };
  const browser: BrowserEnv = options.browser ?? {
    confirm: (msg) => window.confirm(msg),
    open: (url, target, features) => window.open(url, target, features),
    clipboard: (typeof navigator !== 'undefined' ? navigator.clipboard : undefined),
    ClipboardItem: (typeof ClipboardItem !== 'undefined' ? ClipboardItem : undefined),
  };

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function blobToDataUrl(blob: Blob): Promise<string> {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let base64 = '';
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(bytes).toString('base64');
    } else {
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        base64 += String.fromCharCode(...chunk);
      }
      base64 = btoa(base64);
    }
    const mime = blob.type || 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  }

  /**
   * 状态更新逻辑封装
   */
  async function updateStatus(order: Order, status: Order['status']) {
    try {
      isActionInProgress.value = true;
      await (apiClient.put ?? api.put.bind(api))(`/orders/${order.id}/status`, { status });
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
    const result = await apiClient.post<{ snapshotId?: string }>('/print/snapshots', payload);
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
    if (validation.needsConfirm && !browser.confirm(validation.message)) return;

    try {
      const id = await createSnapshot(order, printMode);
      browser.open(
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
    if (validation.needsConfirm && !browser.confirm(validation.message)) return;

    try {
      isActionInProgress.value = true;
      const filename = buildPurchaseOrderPdfFilename(order);
      const id = await createSnapshot(order, printMode);
      await apiClient.downloadPDF('/pdf/generate', {
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
   * 复制截图到系统剪贴板（附带订单号文本）
   */
  async function performCopyScreenshot(order: Order, printMode: string = 'signature') {
    const validation = validateForPrinting(order);
    if (!validation.canProceed) return;
    if (validation.needsConfirm && !browser.confirm(validation.message)) return;

    const orderNo = String(order.order_no || '').trim() || '未命名订单';
    const textPayload = `订单号：${orderNo}`;

    try {
      isActionInProgress.value = true;
      const id = await createSnapshot(order, printMode);
      const pngBlob = await (apiClient.postBlob ?? api.postBlob.bind(api))('/pdf/screenshot', {
        poNumber: order.order_no,
        snapshotId: id,
        printMode,
      });

      if (!(pngBlob instanceof Blob)) {
        throw new Error('Screenshot payload is invalid');
      }

      const clipboard = browser.clipboard;
      const ClipboardItemCtor = browser.ClipboardItem;
      if (!clipboard?.write || !ClipboardItemCtor) {
        if (clipboard?.writeText) {
          await clipboard.writeText(textPayload);
        }
        options.toast({
          title: '当前环境不支持图片剪贴板',
          description: '已复制订单号文本，可在目标应用粘贴后手动补图。',
          variant: 'destructive'
        });
        return;
      }

      const imageDataUrl = await blobToDataUrl(pngBlob);
      const htmlPayload = `<p>${escapeHtml(textPayload)}</p><img src="${imageDataUrl}" alt="${escapeHtml(orderNo)}" />`;
      const clipboardItem = new ClipboardItemCtor({
        'image/png': pngBlob,
        'text/plain': new Blob([textPayload], { type: 'text/plain;charset=utf-8' }),
        'text/html': new Blob([htmlPayload], { type: 'text/html;charset=utf-8' }),
      });
      await clipboard.write([clipboardItem]);

      options.toast({
        title: '截图与订单号已复制',
        description: '可直接在邮件或即时通讯工具中粘贴。',
        variant: 'success'
      });
    } catch (e: any) {
      console.error('Copy screenshot failed', e);
      options.toast({
        title: '复制截图失败',
        description: e?.message || '无法写入系统剪贴板',
        variant: 'destructive'
      });
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
      await apiClient.post(`/orders/${order.id}/arrive`, {
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
    performCopyScreenshot,
    markArrived
  };
}
