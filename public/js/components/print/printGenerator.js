/**
 * 打印生成模块
 * 负责生成打印页面和数据分组
 * 支持多种类别：包装、锁芯、五金、边锁
 */

import { PACKAGING_MAPPING } from '../../config/index.js';
import { parseQuantityPair } from '../../utils/parsers.js';

// Cache for loaded template
let templateCache = null;

/**
 * 类别配置
 */
const CATEGORY_CONFIGS = {
    packaging: {
        title: '包装采购订单',
        headers: ['序号', '产品名称', '规格尺寸', '门边', '左数量', '右数量', '备注'],
        fields: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
        groupBy: 'bz', // 按包装类型分组
        showSupplier: true,
        showPackagingNames: true
    },
    cylinder: {
        title: '锁芯采购订单',
        headers: ['序号', '锁芯型号', '偏心', '数量', '备注'],
        fields: ['no', 'type', 'eccentricity', 'quantity', 'remark'],
        groupBy: 'supplier', // 按供应商分组
        showSupplier: true,
        showPackagingNames: false
    },
    hardware: {
        title: '五金采购订单',
        headers: ['序号', '五金名称', '规格', '数量', '备注'],
        fields: ['no', 'type', 'spec', 'quantity', 'remark'],
        groupBy: 'type',
        showSupplier: true,
        showPackagingNames: false
    },
    lock: {
        title: '边锁采购订单',
        headers: ['序号', '边锁型号', '规格', '数量', '备注'],
        fields: ['no', 'type', 'spec', 'quantity', 'remark'],
        groupBy: 'type',
        showSupplier: true,
        showPackagingNames: false
    }
};

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
 * @param {string} category - 类别 (packaging, cylinder, hardware, lock)
 */
export async function generatePrintPages(order, category = 'packaging') {
    const printOutput = document.getElementById('printOutput');

    // Load template dynamically
    const printPageTemplate = await loadPrintTemplate();

    printOutput.innerHTML = '';

    // Get category-specific configuration
    const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.packaging;

    const groups = groupItemsByCategory(order.list, category);
    const template = printPageTemplate.content;
    const MAX_ROWS_PER_PAGE = 22; // Maximum rows per page (Increased for A4)

    for (const groupKey in groups) {
        const group = groups[groupKey];
        const items = group.items;
        const totalPages = Math.ceil(items.length / MAX_ROWS_PER_PAGE);

        // Split items into pages
        for (let pageNum = 0; pageNum < totalPages; pageNum++) {
            const startIdx = pageNum * MAX_ROWS_PER_PAGE;
            const endIdx = Math.min(startIdx + MAX_ROWS_PER_PAGE, items.length);
            const pageItems = items.slice(startIdx, endIdx);

            const clone = document.importNode(template, true);

            // Fill Header
            const today = new Date().toISOString().split('T')[0];

            // Update title
            const h1 = clone.querySelector('.print-header h1');
            h1.textContent = config.title;
            if (totalPages > 1) {
                h1.innerHTML = `${config.title} <span style="font-size: 14px; font-weight: normal; color: #666;">(第${pageNum + 1}页/共${totalPages}页)</span>`;
            }

            // Fill header info based on category
            clone.querySelector('.p-customer').textContent = order.customerName;
            clone.querySelector('.p-code').textContent = order.code;
            clone.querySelector('.p-date').value = today;
            clone.querySelector('.p-delivery').value = today;

            if (category === 'packaging') {
                // Packaging-specific fields
                clone.querySelector('.p-supplier').textContent = PACKAGING_MAPPING.supplierName || '默认供应商';
                clone.querySelector('.p-int-pkg').textContent = group.internalName || groupKey;
                clone.querySelector('.p-ext-pkg').textContent = group.externalName || groupKey;
            } else if (category === 'cylinder') {
                // Cylinder-specific fields
                clone.querySelector('.p-supplier').textContent = group.supplier || groupKey;
                // 锁芯订单不显示内部名称和外协名称
                clone.querySelector('.p-int-pkg').textContent = '-';
                clone.querySelector('.p-ext-pkg').textContent = '-';
            } else {
                // For other categories (hardware, lock, etc.)
                clone.querySelector('.p-supplier').textContent = group.supplier || groupKey;
                clone.querySelector('.p-int-pkg').textContent = '-';
                clone.querySelector('.p-ext-pkg').textContent = '-';
            }

            // Update table headers
            const thead = clone.querySelector('.print-table thead tr');
            thead.innerHTML = config.headers.map(h => `<th>${h}</th>`).join('');

            // Fill Table
            const tbody = clone.querySelector('.p-tbody');
            let totalQty = 0;
            let totalLeft = 0;
            let totalRight = 0;

            pageItems.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.dataset.itemIndex = startIdx + index;

                config.fields.forEach((field, idx) => {
                    const td = document.createElement('td');
                    let value = '';
                    let editable = true;

                    switch (field) {
                        case 'no':
                            value = startIdx + index + 1;
                            editable = false;
                            break;
                        case 'productModelName':
                            value = item.productModelName || '-';
                            break;
                        case 'spec':
                            value = item.spec || '-';
                            break;
                        case 'mb':
                            value = item.mb || '-';
                            break;
                        case 'qtyLeft':
                            const qtyPair = parseQuantityPair(item.qty);
                            value = qtyPair.left;
                            totalLeft += qtyPair.left;
                            break;
                        case 'qtyRight':
                            const qtyPairR = parseQuantityPair(item.qty);
                            value = qtyPairR.right;
                            totalRight += qtyPairR.right;
                            break;
                        case 'type':
                            value = item.type || '-';
                            break;
                        case 'supplier':
                            value = item.supplier || '-';
                            break;
                        case 'eccentricity':
                            value = item.eccentricity || '-';
                            break;
                        case 'quantity':
                            value = item.quantity || 0;
                            totalQty += (item.quantity || 0);
                            break;
                        case 'remark':
                            value = item.remark || '';
                            break;
                        default:
                            value = '-';
                    }

                    if (editable) {
                        td.setAttribute('contenteditable', 'false');
                        td.dataset.field = field;
                    }
                    td.textContent = value;
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            // Add total row on last page
            if (pageNum === totalPages - 1) {
                const totalRow = document.createElement('tr');
                totalRow.className = 'total-row';

                if (category === 'packaging') {
                    // Calculate total for all items in this packaging group
                    let groupTotalLeft = 0;
                    let groupTotalRight = 0;
                    items.forEach(item => {
                        const qtyPair = parseQuantityPair(item.qty);
                        groupTotalLeft += qtyPair.left;
                        groupTotalRight += qtyPair.right;
                    });

                    totalRow.innerHTML = `
                        <td colspan="4" style="text-align: right;">合计</td>
                        <td>${groupTotalLeft}</td>
                        <td>${groupTotalRight}</td>
                        <td></td>
                    `;
                } else {
                    // For other categories, show total quantity
                    let groupTotal = 0;
                    items.forEach(item => {
                        groupTotal += (item.quantity || 0);
                    });

                    const colspanCount = config.fields.length - 2; // -2 for quantity and remark columns
                    totalRow.innerHTML = `
                        <td colspan="${colspanCount}" style="text-align: right;">合计</td>
                        <td>${groupTotal}</td>
                        <td></td>
                    `;
                }

                tbody.appendChild(totalRow);
            }

            printOutput.appendChild(clone);
        }
    }

    // Initialize zoom level
    printOutput.className = 'zoom-100';
}

/**
 * 按类别分组商品
 * @param {Array} items - 商品明细数组
 * @param {string} category - 类别
 * @returns {Object} 分组后的数据
 */
function groupItemsByCategory(items, category) {
    const config = CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS.packaging;
    const groups = {};

    if (!items) return groups;

    if (category === 'packaging') {
        // Packaging uses special grouping logic
        return groupItemsByPackaging(items);
    }

    // For other categories, group by the configured field
    items.forEach(item => {
        const groupKey = item[config.groupBy] || '未分类';

        if (!groups[groupKey]) {
            groups[groupKey] = {
                supplier: item.supplier || groupKey,
                items: []
            };
        }
        groups[groupKey].items.push(item);
    });

    return groups;
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
