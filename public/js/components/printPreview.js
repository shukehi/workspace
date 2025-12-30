/**
 * 打印预览模块
 * 负责生成打印页面、合并逻辑和缩放控制
 */

import { PACKAGING_MAPPING } from '../config.js';
import { parseQuantityPair } from '../utils.js';

/**
 * 初始化打印预览功能
 */
export function initPrintPreview() {
    const previewBtn = document.getElementById('previewBtn');
    const printOutput = document.getElementById('printOutput');

    previewBtn.addEventListener('click', () => {
        if (!window.currentOrderData) {
            alert('请先查询订单');
            return;
        }

        // 1. Capture Merge Selections
        const checkboxes = document.querySelectorAll('.merge-checkbox');
        const mergeFlags = Array.from(checkboxes).map(cb => cb.checked);

        // 2. Prepare Data for Print
        // Deep copy to avoid mutating original
        const printData = JSON.parse(JSON.stringify(window.currentOrderData));

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
}

/**
 * 尝试合并商品项
 * @param {Array} items - 商品明细数组
 * @returns {Object} { reducedList: Array, canMerge: boolean }
 */
export function tryMergeItems(items) {
    if (!items || items.length === 0) return { reducedList: [], canMerge: false };

    // Group by Packaging Type first (bz) - consistent with generatePrintPages
    const groups = {};
    items.forEach(item => {
        const pkgName = item.bz || "DEFAULT";
        if (!groups[pkgName]) groups[pkgName] = [];
        groups[pkgName].push(item);
    });

    let finalList = [];
    let mergeCount = 0;

    // Process each packaging group
    for (const pkgName in groups) {
        const groupItems = groups[pkgName];

        const independentItems = [];
        const mergeableBuckets = {}; // Key -> Array of items

        groupItems.forEach(item => {
            if (!item._allowMerge) {
                independentItems.push(item);
            } else {
                // Create a unique key for merging: Spec + MB (Wall) + SX (Direction)
                const key = `${item.spec}|${item.mb}|${item.sx}`;

                if (!mergeableBuckets[key]) {
                    mergeableBuckets[key] = [];
                }
                mergeableBuckets[key].push(item);
            }
        });

        // Add independent items to final list
        finalList = finalList.concat(independentItems);

        // Process buckets
        for (const key in mergeableBuckets) {
            const bucket = mergeableBuckets[key];
            if (bucket.length === 1) {
                // Only one item, no merge needed
                finalList.push(bucket[0]);
            } else {
                // Merge these items!
                mergeCount++; // We found a group that reduces N items to 1

                // Base item is the first one
                const mergedItem = JSON.parse(JSON.stringify(bucket[0]));

                let totalLeft = 0;
                let totalRight = 0;
                const productNames = new Set();
                const remarks = new Set();

                bucket.forEach(subItem => {
                    const q = parseQuantityPair(subItem.qty);
                    totalLeft += q.left;
                    totalRight += q.right;

                    if (subItem.productModelName) productNames.add(subItem.productModelName);
                    if (subItem.xsbz) remarks.add(subItem.xsbz);
                });

                // Update merged item properties
                mergedItem.qty = `${totalLeft}/${totalRight}`; // Reconstruct qty string
                mergedItem.productModelName = Array.from(productNames).join('/'); // Join names

                // Mark as merged for potential UI highlighting (optional)
                mergedItem._isMerged = true;

                finalList.push(mergedItem);
            }
        }
    }

    return {
        reducedList: finalList,
        canMerge: mergeCount > 0
    };
}

/**
 * 生成打印页面
 * @param {Object} order - 订单数据
 */
export function generatePrintPages(order) {
    const printOutput = document.getElementById('printOutput');
    const printPageTemplate = document.getElementById('printPageTemplate');

    printOutput.innerHTML = '';
    const groups = groupItemsByPackaging(order.list);
    const template = printPageTemplate.content;
    const MAX_ROWS_PER_PAGE = 22; // Maximum rows per page (Increased for A4)

    for (const pkgName in groups) {
        const group = groups[pkgName];
        const items = group.items;
        const totalPages = Math.ceil(items.length / MAX_ROWS_PER_PAGE);

        // Split items into pages
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const startIdx = pageNum * MAX_ROWS_PER_PAGE;
            const endIdx = Math.min(startIdx + MAX_ROWS_PER_PAGE, items.length);
            const pageItems = items.slice(startIdx, endIdx);

            const clone = document.importNode(template, true);

            // Fill Header with page number and inline date inputs
            const today = new Date().toISOString().split('T')[0];

            clone.querySelector('.p-supplier').textContent = PACKAGING_MAPPING.supplierName || '默认供应商';
            clone.querySelector('.p-customer').textContent = order.customerName;
            clone.querySelector('.p-code').textContent = order.code;
            clone.querySelector('.p-int-pkg').textContent = pkgName;
            clone.querySelector('.p-ext-pkg').textContent = group.externalName;
            clone.querySelector('.p-date').value = today;
            clone.querySelector('.p-delivery').value = today; // 默认也使用今天

            // Add page number if multiple pages
            if (totalPages > 1) {
                const h1 = clone.querySelector('.print-header h1');
                h1.innerHTML = `包装采购订单 <span style="font-size: 14px; font-weight: normal; color: #666;">(第${pageNum + 1}页/共${totalPages}页)</span>`;
            }

            // Fill Table
            const tbody = clone.querySelector('.p-tbody');
            let pageLeftTotal = 0;
            let pageRightTotal = 0;

            pageItems.forEach((item, index) => {
                const qtyPair = parseQuantityPair(item.qty);
                pageLeftTotal += qtyPair.left;
                pageRightTotal += qtyPair.right;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${startIdx + index + 1}</td>
                    <td>${item.productModelName || '-'}</td>
                    <td>${item.spec}</td>
                    <td>${item.mb || '-'}</td>
                    <td>${qtyPair.left}</td>
                    <td>${qtyPair.right}</td>
                    <td contenteditable="true"></td>
                `;
                tbody.appendChild(tr);
            });

            // Add total row on last page
            if (pageNum === totalPages - 1) {
                // Calculate total for all items in this packaging group
                let totalLeft = 0;
                let totalRight = 0;
                items.forEach(item => {
                    const qtyPair = parseQuantityPair(item.qty);
                    totalLeft += qtyPair.left;
                    totalRight += qtyPair.right;
                });

                const totalRow = document.createElement('tr');
                totalRow.className = 'total-row';
                totalRow.innerHTML = `
                    <td colspan="4" style="text-align: right;">合计</td>
                    <td>${totalLeft}</td>
                    <td>${totalRight}</td>
                    <td></td>
                `;
                tbody.appendChild(totalRow);
            }

            printOutput.appendChild(clone);
        }
    }

    // Initialize zoom level
    printOutput.className = 'zoom-100';
}

/**
 * 按包装类型分组商品
 * @param {Array} items - 商品明细数组
 * @returns {Object} 分组后的数据
 */
export function groupItemsByPackaging(items) {
    const groups = {};
    if (!items) return groups;

    items.forEach(item => {
        const internalName = item.bz || "无名称";
        const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
        const externalName = mappings[internalName] || "未匹配";

        if (!groups[internalName]) {
            groups[internalName] = {
                internalName: internalName,
                externalName: externalName,
                items: []
            };
        }
        groups[internalName].items.push(item);
    });
    return groups;
}

/**
 * 初始化缩放控制
 * @param {HTMLElement} printOutput - 打印输出容器
 */
function initZoomControls(printOutput) {
    const zoom50Btn = document.getElementById('zoom50');
    const zoom75Btn = document.getElementById('zoom75');
    const zoom100Btn = document.getElementById('zoom100');
    const zoom125Btn = document.getElementById('zoom125');

    if (zoom50Btn) {
        zoom50Btn.addEventListener('click', () => setZoom('zoom-50', printOutput));
    }
    if (zoom75Btn) {
        zoom75Btn.addEventListener('click', () => setZoom('zoom-75', printOutput));
    }
    if (zoom100Btn) {
        zoom100Btn.addEventListener('click', () => setZoom('zoom-100', printOutput));
    }
    if (zoom125Btn) {
        zoom125Btn.addEventListener('click', () => setZoom('zoom-125', printOutput));
    }

    function setZoom(zoomClass, printOutput) {
        // Remove all zoom classes
        printOutput.className = '';
        // Add selected zoom class
        printOutput.className = zoomClass;

        // Update active button state
        const allZoomBtns = [zoom50Btn, zoom75Btn, zoom100Btn, zoom125Btn];
        allZoomBtns.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        // Add active class to selected button
        const zoomBtnMap = {
            'zoom-50': zoom50Btn,
            'zoom-75': zoom75Btn,
            'zoom-100': zoom100Btn,
            'zoom-125': zoom125Btn
        };
        if (zoomBtnMap[zoomClass]) {
            zoomBtnMap[zoomClass].classList.add('active');
        }
    }
}
