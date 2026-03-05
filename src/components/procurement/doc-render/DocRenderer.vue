<script setup lang="ts">
import { computed } from 'vue';
import type { ProcurementDocModel, ProcurementDocPage } from '@/features/procurement/docModel';

const props = withDefaults(defineProps<{
  model: ProcurementDocModel;
  renderMode?: 'screen' | 'print';
}>(), {
  renderMode: 'screen'
});

const rootClass = computed(() => {
  return props.renderMode === 'print' ? 'doc-render-print' : 'doc-render-screen';
});

function getTotalColspan(page: ProcurementDocPage) {
  if (page.category === 'packaging') return 4;
  if (page.category === 'lock') return page.columns.length - 3;
  return page.columns.length - 2;
}
</script>

<template>
  <div :class="['doc-renderer', rootClass]">
    <article
      v-for="page in model.pages"
      :key="page.pageKey"
      class="print-page"
      :class="page.mode === 'compact' ? 'mode-compact' : ''"
    >
      <div class="print-header">
        <h1>{{ page.title }}</h1>

        <div class="print-info-container">
          <div class="print-info-top-columns">
            <div class="print-col">
              <div class="info-item">
                <label>客户名称:</label>
                <span class="p-customer">{{ page.customerName || '-' }}</span>
              </div>
              <div class="info-item">
                <label>订单号:</label>
                <span class="p-code">{{ page.code || '-' }}</span>
              </div>
            </div>

            <div class="print-col">
              <div class="info-item">
                <label>内部名称:</label>
                <span class="p-int-pkg">{{ page.internalName || '-' }}</span>
              </div>
              <div class="info-item">
                <label>外协名称:</label>
                <span class="p-ext-pkg">{{ page.externalName || '-' }}</span>
              </div>
            </div>

            <div class="print-col">
              <div class="info-item">
                <label>制单日期:</label>
                <span class="p-date p-date-text">{{ page.orderDate }}</span>
              </div>
              <div class="info-item">
                <label>交货日期:</label>
                <span class="p-delivery p-date-text">{{ page.deliveryDate }}</span>
              </div>
            </div>
          </div>

          <div class="print-info-bottom-row">
            <div class="info-item">
              <label>供应商:</label>
              <span class="p-supplier">{{ page.supplier || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <table class="print-table" :class="`category-${page.category}`">
        <colgroup>
          <col
            v-for="column in page.columns"
            :key="`col-${page.pageKey}-${column.key}`"
            :style="column.width ? { width: `${column.width}px` } : undefined"
          />
        </colgroup>
        <thead>
          <tr>
            <th
              v-for="column in page.columns"
              :key="`head-${page.pageKey}-${column.key}`"
              :class="column.numeric ? 'col-numeric' : ''"
            >
              {{ column.label }}
            </th>
          </tr>
        </thead>
        <tbody class="p-tbody">
          <tr
            v-for="(row, rowIdx) in page.rows"
            :key="`row-${page.pageKey}-${rowIdx}`"
            :class="row.rowType === 'total' ? 'total-row' : ''"
          >
            <template v-if="row.rowType === 'item'">
              <td
                v-for="column in page.columns"
                :key="`cell-${page.pageKey}-${rowIdx}-${column.key}`"
                :class="column.numeric ? 'col-numeric' : ''"
              >
                {{ row.values[column.key] ?? '-' }}
              </td>
            </template>

            <template v-else>
              <td :colspan="getTotalColspan(page)" style="text-align: right;">合计</td>
              <template v-if="page.category === 'packaging'">
                <td class="col-numeric">{{ row.values.qtyLeft ?? 0 }}</td>
                <td class="col-numeric">{{ row.values.qtyRight ?? 0 }}</td>
                <td></td>
              </template>
              <template v-else-if="page.category === 'lock'">
                <td class="col-numeric">{{ row.values.quantity ?? 0 }}</td>
                <td></td>
                <td></td>
              </template>
              <template v-else>
                <td class="col-numeric">{{ row.values.quantity ?? 0 }}</td>
                <td></td>
              </template>
            </template>
          </tr>
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
    </article>
  </div>
</template>

<style>
@import url('/css/pages/print.css');

.doc-render-screen {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-render-print {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
