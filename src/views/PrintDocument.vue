<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/lib/api';
import { buildProcurementDocModel } from '@/features/procurement/printDocBuilder';
import { normalizePrintMode, type PrintMode, type ProcurementDocModel, type ProcurementDocPage, type ProcurementDocRow } from '@/features/procurement/docModel';

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
const doc = ref<ProcurementDocModel | null>(null);

const embedded = computed(() => route.query.embedded === '1' || window.self !== window.top);
const modeLabels: Record<PrintMode, string> = {
  signature: '签字版',
  compact: '简洁版',
};

function buildDoc() {
  if (!source.value) {
    doc.value = null;
    return;
  }

  const model = buildProcurementDocModel({
    poNumber: source.value.poNumber,
    category: source.value.category,
    printMode: printMode.value,
    order: source.value.order,
  });

  doc.value = model;
  document.title = model.title || '采购订单';
}

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
    buildDoc();

    if (route.query.autoPrint === '1') {
      setTimeout(() => window.print(), 350);
    }
  } catch (e: any) {
    source.value = null;
    doc.value = null;
    error.value = e?.message || '订单渲染失败';
  } finally {
    loading.value = false;
  }
}

function setPrintMode(mode: PrintMode) {
  if (printMode.value === mode) return;
  printMode.value = mode;
  buildDoc();

  const nextQuery = {
    ...route.query,
    printMode: mode,
  };
  router.replace({ query: nextQuery }).catch(() => undefined);
}

function handlePrint() {
  window.print();
}

async function exportPdf() {
  if (!source.value || !doc.value) return;

  try {
    exporting.value = true;
    const payload: Record<string, any> = {
      poNumber: doc.value.poNumber || source.value.poNumber || 'order',
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
      `${doc.value.poNumber || source.value.poNumber || 'order'}.pdf`
    );
  } catch (e) {
    console.error('Export PDF failed', e);
    alert('PDF 导出失败');
  } finally {
    exporting.value = false;
  }
}

function getColumnClass(column: any) {
  const align = column?.align || 'center';
  return {
    [`col-${align}`]: true,
    'col-numeric': !!column?.numeric,
  };
}

function getDisplayValue(row: ProcurementDocRow, key: string) {
  const value = row.values[key];
  if (value === undefined || value === null) return '';
  return value;
}

type TotalCell = {
  key: string;
  value: string | number;
  colspan?: number;
  className: string;
};

function getTotalCells(page: ProcurementDocPage, row: ProcurementDocRow): TotalCell[] {
  const cells: TotalCell[] = [];
  const labelColspanRaw = Number(row.values.__labelColspan || 1);
  const labelColspan = Number.isFinite(labelColspanRaw)
    ? Math.min(Math.max(Math.floor(labelColspanRaw), 1), page.columns.length)
    : 1;

  cells.push({
    key: '__label',
    value: String(row.values.__label || '合计'),
    colspan: labelColspan,
    className: 'col-right total-label',
  });

  for (let idx = labelColspan; idx < page.columns.length; idx += 1) {
    const column = page.columns[idx];
    const value = row.values[column.key] ?? '';
    const align = column.align || 'center';
    const numericClass = column.numeric ? ' col-numeric' : '';

    cells.push({
      key: column.key,
      value: value as string | number,
      className: `col-${align}${numericClass}`,
    });
  }

  return cells;
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
    buildDoc();
  }
);

onMounted(() => {
  loadSource();
});
</script>

<template>
  <div :class="['print-document-shell', embedded ? 'is-embedded' : '']">
    <div v-if="!embedded" class="controls-bar">
      <div class="controls-title">
        <h2>{{ doc?.title || '采购订单' }}</h2>
        <p v-if="doc?.poNumber" class="controls-subtitle">订单号：{{ doc.poNumber }}</p>
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
      <section
        v-for="page in doc?.pages || []"
        :key="page.pageKey"
        class="print-page"
        :class="page.mode === 'compact' ? 'mode-compact' : ''"
      >
        <div class="print-header">
          <h1>{{ page.title }}</h1>

          <div class="print-info-top-columns">
            <div class="print-col">
              <div class="info-item">
                <label>客户名称:</label>
                <span>{{ page.customerName || '-' }}</span>
              </div>
              <div class="info-item">
                <label>订单号:</label>
                <span>{{ page.code || '-' }}</span>
              </div>
            </div>

            <div class="print-col">
              <div class="info-item">
                <label>内部名称:</label>
                <span>{{ page.internalName || '-' }}</span>
              </div>
              <div class="info-item">
                <label>外协名称:</label>
                <span>{{ page.externalName || '-' }}</span>
              </div>
            </div>

            <div class="print-col">
              <div class="info-item">
                <label>制单日期:</label>
                <span class="p-date-text">{{ page.orderDate || '-' }}</span>
              </div>
              <div class="info-item">
                <label>交货日期:</label>
                <span class="p-date-text">{{ page.deliveryDate || '-' }}</span>
              </div>
            </div>
          </div>

          <div class="print-info-bottom-row">
            <div class="info-item">
              <label>供应商:</label>
              <span>{{ page.supplier || '-' }}</span>
            </div>
          </div>
        </div>

        <table class="print-table" :class="`category-${page.category}`">
          <colgroup>
            <col
              v-for="column in page.columns"
              :key="`col-${page.pageKey}-${column.key}`"
              :style="column.width ? { width: `${column.width}px` } : {}"
            />
          </colgroup>

          <thead>
            <tr>
              <th
                v-for="column in page.columns"
                :key="`head-${page.pageKey}-${column.key}`"
                :class="getColumnClass(column)"
              >
                {{ column.label }}
              </th>
            </tr>
          </thead>

          <tbody>
            <template v-for="(row, rowIndex) in page.rows" :key="`row-${page.pageKey}-${rowIndex}`">
              <tr v-if="row.rowType === 'item'">
                <td
                  v-for="column in page.columns"
                  :key="`cell-${page.pageKey}-${rowIndex}-${column.key}`"
                  :class="getColumnClass(column)"
                >
                  {{ getDisplayValue(row, column.key) }}
                </td>
              </tr>
              <tr v-else class="total-row">
                <td
                  v-for="cell in getTotalCells(page, row)"
                  :key="`total-cell-${page.pageKey}-${rowIndex}-${cell.key}`"
                  :colspan="cell.colspan || 1"
                  :class="cell.className"
                >
                  {{ cell.value }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>

        <div class="print-footer">
          <div class="sign-box">
            <span>制单人:</span>
            <div class="line"></div>
          </div>
          <div class="sign-box">
            <span>审核人:</span>
            <div class="line"></div>
          </div>
          <div class="sign-box">
            <span>供应商签字:</span>
            <div class="line"></div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style src="@/features/procurement/print-document.css"></style>
