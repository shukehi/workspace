/**
 * 打印预览模块 - 主控制器
 * 协调打印相关的各个子模块
 *
 * ✨ 已重构：拆分为子模块，职责更清晰
 */

import { appState } from '../core/state.js';
import { tryMergeItems } from './print/printMerge.js';
import { generatePrintPages } from './print/printGenerator.js';
import { initZoomControls } from './print/printControls.js';

/**
 * 初始化打印预览功能
 */
export function initPrintPreview() {
    const previewBtn = document.getElementById('previewBtn');
    const printOutput = document.getElementById('printOutput');

    previewBtn.addEventListener('click', () => {
        const currentOrder = appState.get('currentOrder');

        if (!currentOrder) {
            alert('请先查询订单');
            return;
        }

        // 1. Capture Merge Selections
        const checkboxes = document.querySelectorAll('.merge-checkbox');
        const mergeFlags = Array.from(checkboxes).map(cb => cb.checked);

        // 2. Prepare Data for Print
        // Deep copy to avoid mutating original
        const printData = JSON.parse(JSON.stringify(currentOrder));

        // Tag items with merge flag
        if (printData.list) {
            printData.list.forEach((item, idx) => {
                item._allowMerge = mergeFlags[idx] || false;
            });
        }

        // 3. Process Merge Logic
        // We first simulate to see if any merging is possible
        const { reducedList, canMerge } = tryMergeItems(printData.list);

        if (canMerge) {
            // Ask user for confirmation
            if (confirm('检测到已勾选"标准"的项可以合并。\n\n【确定】合并相同规格\n【取消】保持独立显示')) {
                printData.list = reducedList;
            }
            // If cancel, we use original printData.list (unmerged)
        }

        generatePrintPages(printData);
        document.body.classList.add('print-mode');

        // Show zoom controls
        const zoomControls = document.getElementById('zoomControls');
        if (zoomControls) {
            zoomControls.classList.remove('hidden');
        }
    });

    // 初始化缩放控制
    initZoomControls(printOutput);

    console.log('✅ PrintPreview 模块初始化完成');
}
