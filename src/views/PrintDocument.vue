<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { normalizePrintMode, type PrintMode } from '@/features/procurement/docModel';
import { PROCUREMENT_DOCUMENT_TITLE } from '@/features/procurement/documentTitles';
import { buildPurchaseOrderPdfFilename } from '@/features/procurement/pdfFilename';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import { resolveSheetWidths, fitPrintColumnWidths } from '@/features/procurement/sheetWidthResolver';
import { validateForPrinting } from '@/features/procurement/orderRules';

type PrintSourcePayload = {
  poNumber?: string;
  category?: string;
  printMode?: string;
  order: any;
  snapshotId?: string;
  orderId?: string;
};

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const exporting = ref(false);
const printMode = ref<PrintMode>('signature');
const source = ref<PrintSourcePayload | null>(null);

const embedded = computed(() => route.query.embedded === '1' || window.self !== window.top);
const autoPrintRequested = computed(() => route.query.autoPrint === '1');
const modeLabels: Record<PrintMode, string> = {
  signature: '签字版',
  compact: '简洁版',
};

const previewWidthState = computed(() => {
  const order = source.value?.order;
  return resolveSheetWidths(
    order?.category || 'packaging',
    order?.metadata?.printColumnWidths,
    { preferLocalWhenMissing: true }
  );
});

const printColumnWidths = computed(() => fitPrintColumnWidths(previewWidthState.value.widths));

function closeAutoPrintWindow() {
  window.close();
}

async function loadSource() {
  try {
    loading.value = true;
    error.value = null;

    const snapshotId = String(route.query.snapshotId || '').trim();
    const orderId = String(route.query.orderId || '').trim();

    if (snapshotId) {
      const snapshot = await api.get<any>(`/print/snapshots/${encodeURIComponent(snapshotId)}`);
      source.value = { ...snapshot.payload, snapshotId };
    } else if (orderId) {
      const order = await api.get<any>(`/orders/${encodeURIComponent(orderId)}`);
      source.value = { poNumber: order.order_no, category: order.category, order, orderId };
    } else {
      throw new Error('缺少 snapshotId 或 orderId');
    }

    if (!source.value) throw new Error('未找到订单数据');

    printMode.value = normalizePrintMode(String(route.query.printMode || source.value.printMode || 'signature'));
    document.title = source.value.order?.order_no ? `${source.value.order.order_no} - ${PROCUREMENT_DOCUMENT_TITLE}` : PROCUREMENT_DOCUMENT_TITLE;

    if (autoPrintRequested.value) {
      window.addEventListener('afterprint', closeAutoPrintWindow);
      setTimeout(() => window.print(), 350);
    }
  } catch (e: any) {
    source.value = null;
    error.value = e?.message || '渲染失败';
  } finally {
    loading.value = false;
  }
}

function setPrintMode(mode: PrintMode) {
  if (printMode.value === mode) return;
  printMode.value = mode;
  router.replace({ query: { ...route.query, printMode: mode } }).catch(() => undefined);
}

function handlePrint() {
  const validation = validateForPrinting(source.value?.order);
  if (!validation.canProceed) return;
  if (validation.needsConfirm && !window.confirm(validation.message)) return;
  window.print();
}

async function exportPdf() {
  if (!source.value) return;
  const validation = validateForPrinting(source.value.order);
  if (!validation.canProceed) return;
  if (validation.needsConfirm && !window.confirm(validation.message)) return;

  try {
    exporting.value = true;
    const payload: Record<string, any> = {
      poNumber: source.value.order?.order_no || source.value.poNumber || 'order',
      printMode: printMode.value,
    };

    if (source.value.snapshotId) payload.snapshotId = source.value.snapshotId;
    else if (source.value.orderId) payload.orderId = source.value.orderId;
    else {
      payload.category = source.value.category || '';
      payload.order = source.value.order;
    }

    await api.downloadPDF('/pdf/generate', payload, buildPurchaseOrderPdfFilename(source.value.order));
  } catch (e) {
    console.error('Export PDF failed', e);
    alert('PDF 导出失败');
  } finally {
    exporting.value = false;
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', closeAutoPrintWindow);
});

watch(() => [route.query.snapshotId, route.query.orderId], () => loadSource());
onMounted(loadSource);
</script>

<template>
  <div class="print-document-shell print-document-container min-h-screen bg-slate-50/50 print:bg-white print:p-0" :class="{ 'pb-20': !embedded }">
    <div v-if="!embedded" class="controls-bar sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b px-4 py-3 flex items-center justify-between shadow-sm print:hidden">
      <div class="flex items-center gap-4">
        <h1 class="text-sm font-bold text-slate-900 truncate max-w-[200px] sm:max-w-md">
          {{ source?.order?.order_no || '打印文档' }}
        </h1>
        <div class="h-4 w-px bg-slate-200"></div>
        <div class="flex p-0.5 bg-slate-100 rounded-md">
          <button v-for="(label, mode) in modeLabels" :key="mode" @click="setPrintMode(mode as PrintMode)" class="px-3 py-1 text-xs font-medium rounded transition-all" :class="printMode === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
            {{ label }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="handlePrint" class="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors inline-flex items-center gap-2">
          <span>打印预览</span>
        </button>
        <button @click="exportPdf" :disabled="exporting" class="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-all inline-flex items-center gap-2">
          <span>{{ exporting ? '导出中...' : '导出 PDF' }}</span>
        </button>
      </div>
    </div>

    <div class="max-w-[820px] mx-auto p-4 md:p-8 print:p-0">
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
        <div class="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
        <p class="text-sm font-medium animate-pulse">正在准备文档数据...</p>
      </div>
      <div v-else-if="error" class="bg-rose-50 border border-rose-100 rounded-xl p-8 text-center max-w-md mx-auto my-12">
        <div class="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-xl font-bold">!</span>
        </div>
        <h2 class="text-rose-900 font-bold mb-2">文档加载失败</h2>
        <p class="text-rose-600/80 text-sm mb-6">{{ error }}</p>
        <button @click="loadSource" class="text-sm font-bold text-rose-700 hover:underline">尝试重新加载</button>
      </div>
      <div v-else-if="source?.order" class="bg-white shadow-[0_0_40px_rgba(0,0,0,0.03)] border border-slate-100 print:shadow-none print:border-0 rounded-sm overflow-hidden">
        <OrderSheetView
          :order="source.order"
          mode="preview"
          :column-widths="printColumnWidths"
          :default-widths="previewWidthState.defaults"
          :aggregate-side-quantities="Boolean(source.order.metadata?.aggregateSideQuantities)"
          customer-name-display="salesDepartment"
        />
      </div>
    </div>
  </div>
</template>

<style>
@import "@/features/procurement/print-document.css";
</style>
