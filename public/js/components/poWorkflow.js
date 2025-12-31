/**
 * Purchase Order Workflow Component
 * Manages the complete PO generation, print, and export workflow
 */

import { appState } from '../core/state.js';
import { eventBus } from '../core/eventBus.js';
import { generatePurchaseOrder, getPurchaseOrder, updatePOStatus } from './purchaseOrder.js';
import { aggregatePackaging } from './packagingTable.js';
import { tryMergeItems } from './print/printMerge.js';
import { generatePrintPages } from './print/printGenerator.js';
import { initZoomControls } from './print/printControls.js';

/**
 * Initialize PO workflow
 */
export function initPOWorkflow() {
    const generatePOBtn = document.getElementById('generatePOBtn');
    const printPOBtn = document.getElementById('printPOBtn');
    const exportPDFBtn = document.getElementById('exportPDFBtn');
    const poInfoPanel = document.getElementById('poInfoPanel');
    const poNumberDisplay = document.getElementById('poNumberDisplay');
    const printOutput = document.getElementById('printOutput');

    // Initialize zoom controls
    initZoomControls(printOutput);

    // ==================== Generate PO ====================
    generatePOBtn.addEventListener('click', async () => {
        const currentOrder = appState.get('currentOrder');

        if (!currentOrder) {
            alert('请先查询订单');
            return;
        }

        // 1. Capture merge selections
        const checkboxes = document.querySelectorAll('.merge-checkbox');
        const mergeFlags = Array.from(checkboxes).map(cb => cb.checked);

        // 2. Prepare data (deep copy)
        const orderData = JSON.parse(JSON.stringify(currentOrder));

        // Tag items with merge flags
        if (orderData.list) {
            orderData.list.forEach((item, idx) => {
                item._allowMerge = mergeFlags[idx] || false;
            });
        }

        // 3. Process merge logic
        const { reducedList, canMerge } = tryMergeItems(orderData.list);

        if (canMerge) {
            if (confirm('检测到已勾选"标准"的项可以合并。\n\n【确定】合并相同规格\n【取消】保持独立显示')) {
                orderData.list = reducedList;
            }
        }

        // 4. Aggregate packaging data
        const packagingData = aggregatePackaging(orderData.list);

        // 5. Generate PO record
        appState.setState({ poGenerating: true });

        try {
            const po = generatePurchaseOrder(orderData, packagingData, mergeFlags);

            // Update state
            appState.setState({
                currentPO: po,
                poGenerating: false
            });

            // Update UI
            poNumberDisplay.textContent = po.poNumber;
            generatePOBtn.classList.add('hidden');
            poInfoPanel.classList.remove('hidden');

            console.log('✅ Purchase Order Generated:', po.poNumber);

        } catch (error) {
            console.error('❌ PO Generation Failed:', error);
            alert('采购单生成失败，请重试');
            appState.setState({ poGenerating: false });
        }
    });

    // ==================== Print PO ====================
    printPOBtn.addEventListener('click', async () => {
        const currentPO = appState.get('currentPO');

        if (!currentPO) {
            alert('请先生成采购单');
            return;
        }

        try {
            // Generate print pages from PO snapshot
            // Reconstruct order object with items list
            const orderForPrint = {
                ...currentPO.order,
                list: currentPO.items
            };
            await generatePrintPages(orderForPrint);
            document.body.classList.add('print-mode');

            // Show zoom controls
            const zoomControls = document.getElementById('zoomControls');
            if (zoomControls) {
                zoomControls.classList.remove('hidden');
            }

            // Update PO status
            updatePOStatus(currentPO.poNumber, 'printed');

            console.log('📄 Print preview opened for:', currentPO.poNumber);

        } catch (error) {
            console.error('❌ Print generation failed:', error);
            alert('打印预览生成失败，请重试');
        }
    });

    // ==================== Export PDF ====================
    exportPDFBtn.addEventListener('click', async () => {
        const currentPO = appState.get('currentPO');

        if (!currentPO) {
            alert('请先生成采购单');
            return;
        }

        let originalZoomClass = '';

        try {
            // Show loading state
            exportPDFBtn.disabled = true;
            exportPDFBtn.textContent = '生成中...';

            console.log('📄 Starting server-side PDF generation for:', currentPO.poNumber);

            // Call backend API to generate PDF
            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    poNumber: currentPO.poNumber,
                    order: {
                        customerName: currentPO.order.customerName,
                        code: currentPO.order.code,
                        orderDate: currentPO.order.orderDate,
                        advanceDate: currentPO.order.advanceDate,
                        remark: currentPO.order.remark,
                        list: currentPO.items
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'PDF 生成失败');
            }

            // Download PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentPO.poNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            // Update PO status
            updatePOStatus(currentPO.poNumber, 'exported');

            console.log('✅ PDF exported successfully:', currentPO.poNumber);

        } catch (error) {
            console.error('❌ PDF export failed:', error);
            alert(error.message || 'PDF 导出失败，请重试');
        } finally {
            // Restore button state
            exportPDFBtn.disabled = false;
            exportPDFBtn.textContent = '导出 PDF';
        }
    });

    // ==================== State Subscriptions ====================

    // Reset PO UI when order changes
    eventBus.on('order:loaded', () => {
        // Reset PO panel
        generatePOBtn.classList.remove('hidden');
        poInfoPanel.classList.add('hidden');
        poNumberDisplay.textContent = '';

        // Clear current PO
        appState.setState({ currentPO: null });
    });

    console.log('✅ PO Workflow initialized');
}
