<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { normalizePrintMode, type PrintMode } from '@/features/procurement/docModel';
import OrderSheetView from '@/components/procurement/OrderSheetView.vue';
import { resolveSheetWidths } from '@/features/procurement/sheetWidthResolver';

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
const customerNameDisplay = computed(() => route.query.pdf === '1' ? 'salesDepartment' : 'full');
const modeLabels: Record<PrintMode, string> = {
  signature: '签字版',
  compact: '简洁版',
};

function closeAutoPrintWindow() {
  if (!autoPrintRequested.value) return;
  if (window.opener || window.history.length <= 1) {
    window.close();
  }
}

function hasValidDeliveryDate(order: any) {
  if (!order?.delivery_date && !order?.deliveryDate) return false;
  const parsed = new Date(order.delivery_date || order.deliveryDate);
  return !Number.isNaN(parsed.getTime());
}

function confirmProceedWhenDeliveryDateMissing() {
  const order = source.value?.order;
  if (!order) return true;
  if (hasValidDeliveryDate(order)) return true;
  return window.confirm('当前订单未设置交货日期，是否继续打印/导出 PDF？');
}

const previewWidthState = computed(() => {
  const order = source.value?.order;
  if (!order) {
    return resolveSheetWidths('packaging', null, { preferLocalWhenMissing: true });
  }
  return resolveSheetWidths(
    order.category,
    order.metadata?.printColumnWidths,
    { preferLocalWhenMissing: true }
  );
});
const previewDefaultWidths = computed(() => previewWidthState.value.defaults);
const previewColumnWidths = computed(() => previewWidthState.value.widths);

const PRINT_TABLE_MAX_WIDTH = 680;

function getColumnMinWidth(key: string) {
  if (key === 'no') return 36;
  if (key === 'quantity' || key === 'qtyLeft' || key === 'qtyRight') return 62;
  if (key === 'unit') return 50;
  if (key === 'remark') return 120;
  return 82;
}

function fitPrintColumnWidths(widths: Record<string, number>) {
  const entries = Object.entries(widths);
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (total <= PRINT_TABLE_MAX_WIDTH || total <= 0) return widths;

  const scale = PRINT_TABLE_MAX_WIDTH / total;
  const next: Record<string, number> = {};
  entries.forEach(([key, value]) => {
    const scaled = Math.floor(Number(value || 0) * scale);
    next[key] = Math.max(getColumnMinWidth(key), scaled);
  });
  return next;
}

const printColumnWidths = computed(() => fitPrintColumnWidths(previewColumnWidths.value));

async function loadSource() {
  try {
    loading.value = true;
    error.value = null;

    const snapshotId = String(route.query.snapshotId || '').trim();
    const orderId = String(route.query.orderId || '').trim();

    if (snapshotId) {
      const snapshot = await api.get<any>(`/print/snapshots/${encodeURIComponent(snapshotId)}`);
      source.value = {
        ...snapshot.payload,
        snapshotId,
      };
    } else if (orderId) {
      const order = await api.get<any>(`/orders/${encodeURIComponent(orderId)}`);
      source.value = {
        poNumber: order.order_no,
        category: order.category,
        order,
        orderId,
      };
    } else {
      throw new Error('缺少 snapshotId 或 orderId，无法渲染打印文档');
    }

    const activeSource = source.value;
    if (!activeSource) {
      throw new Error('未找到可渲染的订单数据');
    }

    printMode.value = normalizePrintMode(String(route.query.printMode || activeSource.printMode || 'signature'));
    document.title = activeSource.order?.order_no ? `${activeSource.order.order_no} - 采购订单` : '采购订单';

    if (autoPrintRequested.value) {
      setTimeout(() => window.print(), 350);
    }
  } catch (e: any) {
    source.value = null;
    error.value = e?.message || '订单渲染失败';
  } finally {
    loading.value = false;
  }
}

function setPrintMode(mode: PrintMode) {
  if (printMode.value === mode) return;
  printMode.value = mode;

  const nextQuery = {
    ...route.query,
    printMode: mode,
  };
  router.replace({ query: nextQuery }).catch(() => undefined);
}

function handlePrint() {
  if (!confirmProceedWhenDeliveryDateMissing()) return;
  window.print();
}

async function exportPdf() {
  if (!source.value) return;
  if (!confirmProceedWhenDeliveryDateMissing()) return;

  try {
    exporting.value = true;
    const payload: Record<string, any> = {
      poNumber: source.value.order?.order_no || source.value.poNumber || 'order',
      printMode: printMode.value,
    };

    if (source.value.snapshotId) {
      payload.snapshotId = source.value.snapshotId;
    } else if (source.value.orderId) {
      payload.orderId = source.value.orderId;
    } else {
      payload.category = source.value.category || '';
      payload.order = source.value.order;
    }

    await api.downloadPDF(
      '/pdf/generate',
      payload,
      `${source.value.order?.order_no || source.value.poNumber || 'order'}.pdf`
    );
  } catch (e) {
    console.error('Export PDF failed', e);
    alert('PDF 导出失败');
  } finally {
    exporting.value = false;
  }
}

watch(
  () => [route.query.snapshotId, route.query.orderId],
  () => {
    loadSource();
  }
);

watch(
  () => route.query.printMode,
  (nextMode) => {
    if (!source.value) return;
    const normalized = normalizePrintMode(String(nextMode || source.value.printMode || 'signature'));
    if (normalized === printMode.value) return;
    printMode.value = normalized;
  }
);

onMounted(() => {
  window.addEventListener('afterprint', closeAutoPrintWindow);
  loadSource();
});

onBeforeUnmount(() => {
  window.removeEventListener('afterprint', closeAutoPrintWindow);
});
</script>

<template>
  <div :class="['print-document-shell', embedded ? 'is-embedded' : '']">
    <div v-if="!embedded" class="controls-bar">
      <div class="controls-title">
        <h2>采购订单</h2>
        <p v-if="source?.order?.order_no" class="controls-subtitle">订单号：{{ source.order.order_no }}</p>
      </div>
      <div class="controls-actions">
        <div class="mode-switch">
          <button
            class="mode-btn"
            :class="printMode === 'signature' ? 'mode-btn-active' : ''"
            @click="setPrintMode('signature')"
          >
            {{ modeLabels.signature }}
          </button>
          <button
            class="mode-btn"
            :class="printMode === 'compact' ? 'mode-btn-active' : ''"
            @click="setPrintMode('compact')"
          >
            {{ modeLabels.compact }}
          </button>
        </div>
        <button class="btn btn-secondary" @click="handlePrint">打印</button>
        <button class="btn btn-primary" :disabled="exporting" @click="exportPdf">
          {{ exporting ? '导出中...' : '导出 PDF' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">正在生成预览...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>
    <div id="printDocumentOutput" v-else>
      <OrderSheetView
        v-if="source?.order"
        :order="source.order"
        mode="preview"
        :customer-name-display="customerNameDisplay"
        :column-widths="printColumnWidths"
        :default-widths="previewDefaultWidths"
      />
    </div>
  </div>
</template>

<style src="@/features/procurement/print-document.css"></style>
