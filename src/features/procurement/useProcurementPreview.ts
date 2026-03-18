import { computed, ref, watch, type Ref } from 'vue';
import type { Order } from '@/types/order';
import { ORDER_STATUS_LABELS } from '@/shared/constants/order';
import { resolveProcurementCategoryLabel, type PrintMode } from '@/features/procurement/docModel';
import { resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';
import { useOrderActions } from '@/features/procurement/composables/useOrderActions';
export { hasValidDeliveryDate } from '@/features/procurement/orderRules';

type ToastFn = (payload: {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}) => void;

export function resolveOrderCategoryLabel(order: Order | null): string {
  return resolveProcurementCategoryLabel(order?.category);
}

export function resolveOrderStatusLabel(order: Order | null): string {
  if (!order) return '-';
  return ORDER_STATUS_LABELS[order.status] || order.status;
}

export function createProcurementPreview(options: {
  order: Ref<Order | null>;
  open: Ref<boolean>;
  toast: ToastFn;
  apiClient?: Parameters<typeof useOrderActions>[0]['apiClient'];
  browser?: Parameters<typeof useOrderActions>[0]['browser'];
}) {
  const snapshotId = ref('');
  const printMode = ref<PrintMode>('signature');
  const modeOptions: Array<{ value: PrintMode; label: string }> = [
    { value: 'signature', label: '签字版' },
    { value: 'compact', label: '简洁版' }
  ];

  const actions = useOrderActions({
    toast: options.toast,
    apiClient: options.apiClient,
    browser: options.browser,
  });

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

  async function handlePrint() {
    if (!options.order.value) return;
    await actions.performPrint(options.order.value, printMode.value);
  }

  async function handleExportPdf() {
    if (!options.order.value) return;
    await actions.performExportPdf(options.order.value, printMode.value);
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
    exportingPdf: actions.isActionInProgress,
    snapshotLoading: actions.isActionInProgress,
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
