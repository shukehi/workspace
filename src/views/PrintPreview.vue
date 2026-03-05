<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { generatePrintPages, normalizePrintCategory, normalizePrintMode } from '@/services/printPreviewGenerator';
import { api } from '@/lib/api';

type PrintCategory = 'packaging' | 'cylinder' | 'hardware' | 'lock';
type PrintMode = 'signature' | 'compact';

const route = useRoute();
const printOutputRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const exporting = ref(false);

const poTitle = ref('采购订单预览');
const currentPONumber = ref('');
const embedded = computed(() => route.query.embedded === '1' || window.self !== window.top);

const categoryLabels: Record<string, string> = {
    packaging: '包装采购订单',
    cylinder: '锁芯采购订单',
    hardware: '五金采购订单',
    lock: '锁叉采购订单'
};

let currentOrderData: any = null;
let currentCategory: PrintCategory = 'packaging';
const printMode = ref<PrintMode>('signature');
const modeLabels: Record<PrintMode, string> = {
    signature: '签字版',
    compact: '简洁版'
};

async function renderPreview(orderData: any) {
    if (!printOutputRef.value) throw new Error('预览容器未初始化');
    await generatePrintPages(printOutputRef.value, orderData, currentCategory, printMode.value);
}

async function initPreview() {
    try {
        loading.value = true;
        error.value = null;

        const rawOrderData = localStorage.getItem('_order_preview_data');
        const poNumber = localStorage.getItem('_order_preview_po_number') || '';
        const categoryRaw = localStorage.getItem('_order_preview_category') || 'packaging';
        const modeRaw = localStorage.getItem('_order_preview_print_mode')
            || String(route.query.printMode || '');
        const category = normalizePrintCategory(categoryRaw);
        printMode.value = normalizePrintMode(modeRaw);

        if (!rawOrderData) throw new Error('未找到订单数据');

        const orderData = JSON.parse(rawOrderData);
        currentPONumber.value = poNumber || 'order';
        currentOrderData = orderData;
        currentCategory = category;

        const label = categoryLabels[category] || '采购订单';
        poTitle.value = `${label} ${poNumber}`.trim();
        document.title = poTitle.value;

        await nextTick();
        await renderPreview(orderData);

        if (localStorage.getItem('_order_preview_auto_print') === 'true') {
            localStorage.removeItem('_order_preview_auto_print');
            setTimeout(() => window.print(), 400);
        }

        localStorage.removeItem('_order_preview_data');
        localStorage.removeItem('_order_preview_po_number');
        localStorage.removeItem('_order_preview_category');
        localStorage.removeItem('_order_preview_print_mode');
    } catch (e: any) {
        error.value = e.message || '预览生成失败';
    } finally {
        loading.value = false;
    }
}

async function exportPdf() {
    if (!currentOrderData) {
        alert('未找到订单数据，无法导出。');
        return;
    }

    try {
        exporting.value = true;
        await api.downloadPDF('/pdf/generate', {
            poNumber: currentPONumber.value || 'order',
            category: currentCategory,
            printMode: printMode.value,
            order: currentOrderData
        }, `${currentPONumber.value || 'order'}.pdf`);
    } catch (e) {
        console.error('PDF export failed', e);
        alert('PDF 导出失败');
    } finally {
        exporting.value = false;
    }
}

function handlePrint() {
    window.print();
}

async function setPrintMode(mode: PrintMode) {
    if (printMode.value === mode) return;
    printMode.value = mode;
    if (!currentOrderData) return;
    try {
        loading.value = true;
        await nextTick();
        await renderPreview(currentOrderData);
    } catch (e) {
        console.error('Switch print mode failed', e);
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    initPreview();
});
</script>

<template>
    <div :class="['print-preview-shell', embedded ? 'in-iframe' : '']">
        <div v-if="!embedded" class="controls-bar">
            <div class="controls-title">
                <h2>{{ poTitle }}</h2>
                <p v-if="currentPONumber" class="controls-subtitle">订单号：{{ currentPONumber }}</p>
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
        <div id="printOutput" ref="printOutputRef" v-show="!loading && !error"></div>
    </div>
</template>

<style>
@import url('/css/pages/print.css');

.print-preview-shell {
    background: #f8fafc;
    min-height: 100vh;
    margin: 0;
    padding-top: 56px;
}

.print-preview-shell.in-iframe {
    padding-top: 0;
    min-height: 100%;
}

#printOutput {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 8px 12px 12px;
    width: 100%;
    box-sizing: border-box;
}

.print-preview-shell.in-iframe #printOutput {
    padding: 0;
}

.controls-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    border-bottom: 1px solid #e5e7eb;
    padding: 12px 20px;
    box-shadow: 0 6px 24px rgba(15, 23, 42, 0.08);
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    backdrop-filter: blur(10px);
}

.controls-title h2 {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
}

.controls-subtitle {
    margin-top: 2px;
    font-size: 12px;
    color: #6b7280;
}

.controls-actions {
    display: flex;
    gap: 10px;
    align-items: center;
}

.mode-switch {
    display: inline-flex;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
}

.mode-btn {
    border: 0;
    background: transparent;
    color: #374151;
    padding: 7px 11px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
}

.mode-btn-active {
    background: #111827;
    color: #fff;
}

.btn {
    padding: 8px 14px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn:disabled {
    opacity: 0.65;
    cursor: not-allowed;
}

.btn-primary {
    background: #0f766e;
    color: white;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
}

.btn-primary:hover:not(:disabled) {
    background: #0d6a63;
}

.btn-secondary {
    background: #f3f4f6;
    color: #111827;
    border: 1px solid #d1d5db;
}

.btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
}

.state {
    color: white;
    text-align: center;
    padding: 40px 16px;
}

.state.error {
    color: #fecaca;
}
</style>
