// @ts-nocheck
/**
 * 包装汇总表模块
 * 负责聚合和展示包装采购数据
 */


// import { PACKAGING_MAPPING } from '../config/index.js';
import { parseQuantity, parseQuantityPair } from './parsers';

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
 * @param {Object} PACKAGING_MAPPING - 注入的配置
 * @returns {Object} 聚合后的包装数据
 */
export function aggregatePackaging(items, PACKAGING_MAPPING = {}) {
    const groups = {};

    if (!items || !Array.isArray(items)) {
        console.warn('aggregatePackaging received invalid items:', items);
        return {};
    }

    items.forEach(item => {
        const internalName = item.bz || "未知";
        // mappings maps internal packaging name -> external packaging name, not supplier.
        const mappings = PACKAGING_MAPPING.mappings || PACKAGING_MAPPING;
        const supplierName = PACKAGING_MAPPING.supplierName || "方亮包装";
        const externalName = mappings[internalName] || internalName + " (未匹配)";
        const spec = item.spec || "未知规格";
        const mb = item.mb || "-";
        const qty = parseQuantity(item.qty);
        const qtyPair = parseQuantityPair(item.qty);

        // Keep edge type in grouping key so merged rows still preserve correct "门边" values.
        const groupKey = `${supplierName}|${externalName}|${spec}|${mb}`;

        if (!groups[groupKey]) {
            groups[groupKey] = {
                internalName: internalName,
                externalName: externalName,
                supplierName: supplierName,
                spec: spec,
                mb: mb,
                totalLeft: 0,
                totalRight: 0,
                totalQty: 0
            };
        }

        groups[groupKey].totalQty += qty;
        groups[groupKey].totalLeft += qtyPair.left;
        groups[groupKey].totalRight += qtyPair.right;
    });

    return groups;
}
