<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { generatePrintPages, normalizePrintCategory } from '@/services/printPreviewGenerator';

declare global {
    interface Window {
        html2pdf?: any;
    }
}

const route = useRoute();
const printOutputRef = ref<HTMLElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const poTitle = ref('采购订单预览');
const embedded = computed(() => route.query.embedded === '1' || window.self !== window.top);

const categoryLabels: Record<string, string> = {
    packaging: '包装采购订单',
    cylinder: '锁芯采购订单',
    hardware: '五金采购订单',
    lock: '锁叉采购订单'
};

let currentPONumber = '';

function loadHtml2Pdf() {
    return new Promise<void>((resolve, reject) => {
        if (window.html2pdf) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
        document.head.appendChild(script);
    });
}

async function initPreview() {
    try {
        loading.value = true;
        error.value = null;

        const rawOrderData = localStorage.getItem('_order_preview_data');
        const poNumber = localStorage.getItem('_order_preview_po_number') || '';
        const categoryRaw = localStorage.getItem('_order_preview_category') || 'packaging';
        const category = normalizePrintCategory(categoryRaw);

        if (!rawOrderData) throw new Error('未找到订单数据');

        const orderData = JSON.parse(rawOrderData);
        currentPONumber = poNumber || 'order';

        const label = categoryLabels[category] || '采购订单';
        poTitle.value = `${label} ${poNumber}`.trim();
        document.title = poTitle.value;

        await nextTick();
        if (!printOutputRef.value) throw new Error('预览容器未初始化');
        await generatePrintPages(printOutputRef.value, orderData, category);

        if (localStorage.getItem('_order_preview_auto_print') === 'true') {
            localStorage.removeItem('_order_preview_auto_print');
            setTimeout(() => window.print(), 400);
        }

        localStorage.removeItem('_order_preview_data');
        localStorage.removeItem('_order_preview_po_number');
        localStorage.removeItem('_order_preview_category');
    } catch (e: any) {
        error.value = e.message || '预览生成失败';
    } finally {
        loading.value = false;
    }
}

async function exportPdf() {
    try {
        await loadHtml2Pdf();
        if (!printOutputRef.value || !window.html2pdf) return;

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${currentPONumber || 'order'}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await window.html2pdf().set(opt).from(printOutputRef.value).save();
    } catch (e) {
        console.error('PDF export failed', e);
        alert('PDF 导出失败');
    }
}

function handlePrint() {
    window.print();
}

onMounted(() => {
    initPreview();
});
</script>

<template>
    <div :class="['print-preview-shell', embedded ? 'in-iframe' : '']">
        <div v-if="!embedded" class="controls-bar">
            <h2>{{ poTitle }}</h2>
            <div class="controls-actions">
                <button class="btn btn-primary" @click="handlePrint">打印</button>
                <button class="btn btn-primary" @click="exportPdf">导出PDF</button>
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
    background-color: #525659;
    min-height: 100vh;
    margin: 0;
    padding-top: 60px;
}

.print-preview-shell.in-iframe {
    padding-top: 20px;
}

#printOutput {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    padding: 40px 0;
    width: 100%;
}

.controls-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: white;
    padding: 12px 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.controls-actions {
    display: flex;
    gap: 10px;
}

.btn {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    cursor: pointer;
}

.btn-primary {
    background: #10b981;
    color: white;
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
