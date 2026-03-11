import { computed, ref, watch, type Ref } from 'vue';
import { api } from '@/lib/api';
import type { Order } from '@/types/order';
import { type PrintMode } from '@/features/procurement/docModel';
import { resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

type ApiLike = {
  post: <T>(url: string, data?: unknown) => Promise<T>;
  downloadPDF: (url: string, data: unknown, filename: string) => Promise<void>;
};

type WindowLike = Pick<Window, 'confirm' | 'open'>;

export function resolveOrderCategoryLabel(order: Order | null): string {
  if (!order?.category) return '未分类';
  const raw = String(order.category).toLowerCase();
  if (raw.includes('包装') || raw === 'packaging') return '包装';
  if (raw.includes('锁芯') || raw === 'cylinder') return '锁芯';
  if (raw.includes('锁具') || raw === 'lockset') return '锁具';
  if (raw.includes('拉手') || raw === 'handle') return '拉手';
  if (raw.includes('锁叉') || raw === 'lock') return '锁叉';
  if (raw.includes('五金') || raw.includes('配件') || raw === 'hardware') return '五金';
  return order.category;
}

export function resolveOrderStatusLabel(order: Order | null): string {
  if (!order) return '-';
  const statusLabels: Record<Order['status'], string> = {
    draft: '草稿',
    submitted: '已提交',
    processing: '处理中',
    completed: '已完成',
    cancelled: '已取消'
  };
  return statusLabels[order.status] || order.status;
}

export function hasValidDeliveryDate(order: Order) {
  if (!order.delivery_date) return false;
  const parsed = new Date(order.delivery_date);
  return !Number.isNaN(parsed.getTime());
}

export function createProcurementPreview(options: {
  order: Ref<Order | null>;
  open: Ref<boolean>;
  toast: ToastFn;
  apiClient?: ApiLike;
  browser?: WindowLike;
}) {
  const apiClient = options.apiClient ?? api;
  const browser = options.browser ?? window;

  const exportingPdf = ref(false);
  const snapshotLoading = ref(false);
  const snapshotId = ref('');
  const printMode = ref<PrintMode>('signature');
  const modeOptions: Array<{ value: PrintMode; label: string }> = [
    { value: 'signature', label: '签字版' },
    { value: 'compact', label: '简洁版' }
  ];

  const orderCategoryLabel = computed(() => resolveOrderCategoryLabel(options.order.value));
  const orderStatusLabel = computed(() => resolveOrderStatusLabel(options.order.value));

  const previewWidthState = computed(() => {
    if (!options.order.value) {
      return resolveSheetWidths('packaging', null, { preferLocalWhenMissing: true });
    }
    return resolveSheetWidths(
      options.order.value.category,
      options.order.value.metadata?.printColumnWidths,
      { preferLocalWhenMissing: true }
    );
  });
  const previewDefaultWidths = computed(() => previewWidthState.value.defaults);
  const previewColumnWidths = computed(() => previewWidthState.value.widths);

  function confirmProceedWhenDeliveryDateMissing(order: Order) {
    if (hasValidDeliveryDate(order)) return true;
    return browser.confirm('当前订单未设置交货日期，是否继续打印/导出 PDF？');
  }

  async function createSnapshot() {
    if (!options.order.value) return '';

    snapshotLoading.value = true;
    try {
      const payload = {
        poNumber: options.order.value.order_no,
        category: options.order.value.category || '',
        printMode: printMode.value,
        order: options.order.value,
      };
      const result = await apiClient.post<{ snapshotId?: string }>('/print/snapshots', payload);
      const id = String(result?.snapshotId || '').trim();
      if (!id) {
        throw new Error('快照创建失败');
      }
      snapshotId.value = id;
      return id;
    } catch (error) {
      snapshotId.value = '';
      throw error;
    } finally {
      snapshotLoading.value = false;
    }
  }

  async function ensureSnapshot() {
    if (snapshotId.value) return snapshotId.value;
    return await createSnapshot();
  }

  async function handlePrint() {
    if (!options.order.value) return;
    if (!confirmProceedWhenDeliveryDateMissing(options.order.value)) return;

    try {
      const id = await ensureSnapshot();
      browser.open(
        `/print-document?snapshotId=${encodeURIComponent(id)}&printMode=${printMode.value}&autoPrint=1&t=${Date.now()}`,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (error) {
      console.error('Open print window failed', error);
      options.toast({
        title: '打印失败',
        description: '无法生成打印预览',
        variant: 'destructive'
      });
    }
  }

  async function handleExportPdf() {
    if (!options.order.value) return;
    if (!confirmProceedWhenDeliveryDateMissing(options.order.value)) return;

    exportingPdf.value = true;
    try {
      const id = await ensureSnapshot();
      await apiClient.downloadPDF('/pdf/generate', {
        poNumber: options.order.value.order_no,
        snapshotId: id,
        printMode: printMode.value,
      }, `${options.order.value.order_no}.pdf`);

      options.toast({
        title: '导出成功',
        description: `已导出 ${options.order.value.order_no}.pdf`,
        variant: 'success'
      });
    } catch (error) {
      console.error('Export PDF failed', error);
      options.toast({
        title: '导出失败',
        description: '请稍后重试',
        variant: 'destructive'
      });
    } finally {
      exportingPdf.value = false;
    }
  }

  function handlePrintModeChange(mode: PrintMode) {
    if (printMode.value === mode) return;
    printMode.value = mode;
  }

  watch(
    () => [options.open.value, options.order.value],
    () => {
      snapshotId.value = '';
    },
    { deep: true }
  );

  return {
    exportingPdf,
    snapshotLoading,
    printMode,
    modeOptions,
    orderCategoryLabel,
    orderStatusLabel,
    previewDefaultWidths,
    previewColumnWidths,
    handlePrint,
    handleExportPdf,
    handlePrintModeChange,
  };
}
