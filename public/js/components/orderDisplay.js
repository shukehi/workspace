/**
 * 订单展示模块
 * 负责渲染订单概览和商品明细
 */

import { setText, parseQuantityPair } from '../utils.js';
import { renderPackagingSummary } from './packagingTable.js';

/**
 * 渲染订单信息
 * @param {Object} order - 订单数据对象
 */
export function renderOrder(order) {
    const resultContainer = document.getElementById('resultContainer');
    const detailsTableBody = document.getElementById('detailsTableBody');

    // 渲染订单概览
    setText('customerName', order.customerName);
    setText('orderCode', order.code);
    setText('orderDate', order.orderDate);
    setText('advanceDate', order.advanceDate);
    setText('orderRemark', order.remark || '无');

    // 渲染商品明细表格
    detailsTableBody.innerHTML = '';

    let allItems = [];

    if (order.list && order.list.length > 0) {
        allItems = order.list; // Store for aggregation
        order.list.forEach((item, index) => {
            const row = document.createElement('tr');

            // Parse details for better display tags
            const detailTags = [];
            if (item.mz) detailTags.push(item.mz); // Door material?
            if (item.tc) detailTags.push(`填充: ${item.tc}`);
            if (item.xd) detailTags.push(item.xd);

            const detailsHtml = detailTags.map(tag => `<span class="detail-tag">${tag}</span>`).join('');

            // Parse quantity into left and right
            const qtyPair = parseQuantityPair(item.qty);

            row.innerHTML = `
                <td>${item.No}</td>
                <td>
                    <div style="font-weight:500">${item.productModelName || '-'}</div>
                    <span class="spec-detail">${item.bz || ''}</span>
                </td>
                <td>${item.spec}</td>
                <td>${item.color}</td>
                <td style="font-weight:600">${qtyPair.left}</td>
                <td style="font-weight:600">${qtyPair.right}</td>
                <td>${item.mb}</td>
                <td>${item.sx || '-'}</td>
                <td>
                    <div style="max-width: 250px;">
                        ${detailsHtml}
                        <div class="spec-detail" style="margin-top:4px;">${item.xsbz || ''}</div>
                    </div>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                    <label style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                        <input type="checkbox" class="merge-checkbox" data-index="${index}" style="width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-size:10px; color:#666; margin-top: 4px;">标准</span>
                    </label>
                </td>
            `;
            detailsTableBody.appendChild(row);
        });
    } else {
        detailsTableBody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 20px;">暂无明细数据</td></tr>';
    }

    // 渲染包装汇总
    renderPackagingSummary(allItems);

    // 显示结果容器
    resultContainer.classList.remove('hidden');
}
