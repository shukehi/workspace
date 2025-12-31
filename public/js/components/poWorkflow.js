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
import { exportPurchaseOrderToPDF } from '../utils/pdfExport.js';

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
            exportPDFBtn.textContent = '导出中...';

            console.log('📄 Starting PDF export for:', currentPO.poNumber);

            // Generate print pages temporarily
            // Reconstruct order object with items list
            const orderForPrint = {
                ...currentPO.order,
                list: currentPO.items
            };
            await generatePrintPages(orderForPrint);

            // Make content visible for PDF rendering
            document.body.classList.add('print-mode');

            // Get the print output container
            const printContainer = document.getElementById('printOutput');

            // Remove zoom class to prevent transform issues with html2canvas
            const originalZoomClass = printContainer.className;
            printContainer.className = '';

            // Wait for DOM to update and CSS to apply
            await new Promise(resolve => setTimeout(resolve, 300));

            if (!printContainer) {
                throw new Error('Print container not found');
            }

            if (printContainer.children.length === 0) {
                console.error('Print container is empty after generation');
                throw new Error('打印内容生成失败，请重试');
            }

            console.log(`📄 Print content ready: ${printContainer.children.length} pages`);

            // Verify .print-page elements are present and visible
            const pages = printContainer.querySelectorAll('.print-page');
            console.log(`📄 Found ${pages.length} .print-page elements`);

            if (pages.length > 0) {
                const firstPage = pages[0];
                const computedStyle = window.getComputedStyle(firstPage);
                console.log('First page debug info:', {
                    width: firstPage.offsetWidth,
                    height: firstPage.offsetHeight,
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    backgroundColor: computedStyle.backgroundColor
                });
            }

            // Export to PDF (pdfExport will extract .print-page elements)
            await exportPurchaseOrderToPDF(currentPO.poNumber, printContainer);

            // Update PO status
            updatePOStatus(currentPO.poNumber, 'exported');

            // Restore zoom class
            printContainer.className = originalZoomClass;

            // Clean up: remove print-mode class and clear print pages
            document.body.classList.remove('print-mode');
            printContainer.innerHTML = '';

            console.log('✅ PDF exported successfully:', currentPO.poNumber);

        } catch (error) {
            console.error('❌ PDF export failed:', error);
            alert(error.message || 'PDF 导出失败，请重试');
        } finally {
            // Always cleanup: remove print-mode and clear container
            document.body.classList.remove('print-mode');
            const printContainer = document.getElementById('printOutput');
            if (printContainer) {
                // Restore zoom class if it was saved
                if (originalZoomClass) {
                    printContainer.className = originalZoomClass;
                }
                printContainer.innerHTML = '';
            }

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
