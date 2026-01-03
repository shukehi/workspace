/**
 * 打印生成模块
 * 负责生成打印页面和数据分组
 */

import { PACKAGING_MAPPING } from '../../config/index.js';
import { parseQuantityPair } from '../../utils/parsers.js';

// Cache for loaded template
let templateCache = null;

/**
 * 加载打印模板
 * @returns {Promise<HTMLTemplateElement>}
 */
async function loadPrintTemplate() {
    if (templateCache) {
        return templateCache;
    }

    const response = await fetch('/templates/print-page.html');
    const html = await response.text();

    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Extract the template element
    const template = tempDiv.querySelector('template');

    if (!template) {
        throw new Error('Print template not found in templates/print-page.html');
    }

    // Cache it
    templateCache = template;
    return template;
}

/**
 * 生成打印页面
 * @param {Object} order - 订单数据
 */
export async function generatePrintPages(order) {
    const printOutput = document.getElementById('printOutput');

    // Load template dynamically
    const printPageTemplate = await loadPrintTemplate();

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
                const remark = ''; // 留空备注，供手写/后续填写

                const tr = document.createElement('tr');
                tr.dataset.itemIndex = startIdx + index; // 添加索引用于保存

                const cells = [
                    { value: startIdx + index + 1, editable: false, field: 'no' },
                    { value: item.productModelName || '-', editable: true, field: 'productModelName' },
                    { value: item.spec, editable: true, field: 'spec' },
                    { value: item.mb || '-', editable: true, field: 'mb' },
                    { value: qtyPair.left, editable: true, field: 'qtyLeft' },
                    { value: qtyPair.right, editable: true, field: 'qtyRight' },
                    { value: remark, editable: true, field: 'remark' }
                ];

                cells.forEach((cell, idx) => {
                    const td = document.createElement('td');
                    if (cell.editable) {
                        td.setAttribute('contenteditable', 'false'); // 默认不可编辑
                        td.dataset.field = cell.field;
                    }
                    td.textContent = cell.value;
                    tr.appendChild(td);
                });
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
