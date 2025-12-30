/**
 * 包装汇总表模块
 * 负责聚合和展示包装采购数据
 */

import { PACKAGING_MAPPING } from '../config.js';
import { parseQuantity } from '../utils.js';

/**
 * 渲染包装采购汇总表
 * @param {Array} items - 商品明细数组
 */
export function renderPackagingSummary(items) {
    const packagingTableBody = document.getElementById('packagingTableBody');
    packagingTableBody.innerHTML = '';

    const aggregatedData = aggregatePackaging(items);

    if (Object.keys(aggregatedData).length === 0) {
        packagingTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">无包装数据</td></tr>';
        return;
    }

    for (const key in aggregatedData) {
        const data = aggregatedData[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="font-weight:600; color:var(--primary-color)">${data.supplierName}</td>
            <td>${data.spec}</td>
            <td style="font-weight:700; font-size: 1.1em">${data.totalQty}</td>
        `;
        packagingTableBody.appendChild(row);
    }
}

/**
 * 聚合包装数据
 * @param {Array} items - 商品明细数组
 * @returns {Object} 聚合后的包装数据
 */
export function aggregatePackaging(items) {
    const groups = {};

    items.forEach(item => {
        const internalName = item.bz || "未知";
        // Map to supplier name, default to internal name along with a marker if not found
        const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
        const supplierName = mappings[internalName] || internalName + " (未匹配)";
        const spec = item.spec || "未知规格";
        const qty = parseQuantity(item.qty);

        // Create a unique key for grouping: Name + Spec
        const groupKey = `${supplierName}|${spec}`;

        if (!groups[groupKey]) {
            groups[groupKey] = {
                supplierName: supplierName,
                spec: spec,
                totalQty: 0
            };
        }

        groups[groupKey].totalQty += qty;
    });

    return groups;
}
