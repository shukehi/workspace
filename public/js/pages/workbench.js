/**
 * Workbench Page Controller
 * 
 * Manages the interaction for the Procurement Workbench (Plan C).
 * Handles tab switching, data fetching, and coordination of sub-modules.
 */

import { fetchOrderDetail } from '../services/api.js';
import { appState } from '../core/state.js';
import { eventBus } from '../core/eventBus.js';
import { loadPackagingMapping } from '../config/index.js';
import { initNavigation } from '../components/navigation.js';
import { renderPackagingSummary } from '../components/packagingTable.js';
import { parseQuantityPair } from '../utils/parsers.js';
import { setText } from '../utils/dom.js';
import { smartSidebar } from '../components/SmartSidebar.js';
import { generatePurchaseOrder, updatePOStatus } from '../components/purchaseOrder.js';
import { aggregatePackaging } from '../components/packagingTable.js';
import { tryMergeItems } from '../components/print/printMerge.js';

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Workbench initializing...');

    // 1. Init Navigation
    initNavigation();

    // 2. Load Config
    await loadPackagingMapping();
    console.log('✅ Config loaded');

    // 3. Bind UI Events
    bindEvents();

    // 4. Listen to Global Events
    setupEventSubscriptions();

    console.log('✅ Workbench ready');
});

// ==================== Event Handlers ====================

function bindEvents() {
    // Command Panel: Fetch Button
    const searchBtn = document.getElementById('searchBtn');
    const orderCodeInput = document.getElementById('orderCodeInput');

    searchBtn.addEventListener('click', handleFetch);
    orderCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleFetch();
    });

    // Central Hub: Tab Switching
    const tabs = document.querySelectorAll('.hub-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            switchTab(target);
        });
    });

    // Packaging PO Events
    bindPackagingEvents();

    // Sidebar: Status (Demo interaction)
    const statusIndicator = document.getElementById('workbenchStatus');
    statusIndicator.addEventListener('click', () => {
        // Just for fun/demo: toggle status
        const dot = statusIndicator.querySelector('.status-dot');
        dot.classList.toggle('idle');
        dot.classList.toggle('busy');
        statusIndicator.querySelector('.status-text').textContent =
            dot.classList.contains('idle') ? 'IDLE' : 'PROCESSING';
    });
}

function bindPackagingEvents() {
    // ==================== Generate PO ====================
    document.getElementById('generatePackagingPOBtn').addEventListener('click', async () => {
        const currentOrder = appState.get('currentOrder');

        if (!currentOrder) {
            showError('请先加载订单数据');
            return;
        }

        try {
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
            const po = generatePurchaseOrder(orderData, packagingData, mergeFlags);

            // 6. Update state
            appState.setState({ currentPackagingPO: po });

            // 7. Update UI
            document.getElementById('packagingPONumber').textContent = po.poNumber;
            document.getElementById('generatePackagingPOBtn').classList.add('hidden');
            document.getElementById('packagingPOPanel').classList.remove('hidden');

            console.log('✅ Packaging PO Generated:', po.poNumber);

        } catch (error) {
            console.error('❌ PO Generation Failed:', error);
            showError('采购单生成失败，请重试');
        }
    });

    // ==================== Print PO ====================
    document.getElementById('printPackagingBtn').addEventListener('click', async () => {
        const currentPO = appState.get('currentPackagingPO');

        if (!currentPO) {
            showError('请先生成采购单');
            return;
        }

        try {
            // Prepare order data for print preview
            const orderForPrint = {
                ...currentPO.order,
                list: currentPO.items
            };

            // Store data temporarily in localStorage for the new window to access
            localStorage.setItem('_print_preview_data', JSON.stringify(orderForPrint));
            localStorage.setItem('_print_preview_po_number', currentPO.poNumber);

            // Open print preview in new window
            const printWindow = window.open(
                '/print-preview.html',
                '_blank',
                'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
            );

            if (!printWindow) {
                showError('无法打开打印预览窗口，请检查浏览器弹窗拦截设置');
                // Clean up temporary data
                localStorage.removeItem('_print_preview_data');
                localStorage.removeItem('_print_preview_po_number');
                return;
            }

            // Update PO status
            updatePOStatus(currentPO.poNumber, 'printed');

            console.log('📄 Print preview opened for:', currentPO.poNumber);

        } catch (error) {
            console.error('❌ Print preview failed:', error);
            showError('打印预览失败，请重试');
        }
    });

    // ==================== Export PDF ====================
    document.getElementById('exportPackagingPDFBtn').addEventListener('click', async () => {
        const currentPO = appState.get('currentPackagingPO');

        if (!currentPO) {
            showError('请先生成采购单');
            return;
        }

        const exportBtn = document.getElementById('exportPackagingPDFBtn');

        try {
            // Show loading state
            exportBtn.disabled = true;
            exportBtn.textContent = '生成中...';

            console.log('📄 Starting PDF generation for:', currentPO.poNumber);

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
            const pdfBlob = blob.type === 'application/pdf'
                ? blob
                : new Blob([blob], { type: 'application/pdf' });

            const url = window.URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${currentPO.poNumber}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Delay cleanup to ensure download starts
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);

            // Update PO status
            updatePOStatus(currentPO.poNumber, 'exported');

            console.log('✅ PDF exported successfully:', currentPO.poNumber);

        } catch (error) {
            console.error('❌ PDF export failed:', error);
            showError(error.message || 'PDF 导出失败，请重试');
        } finally {
            // Restore button state
            exportBtn.disabled = false;
            exportBtn.textContent = 'PDF';
        }
    });
}

function setupEventSubscriptions() {
    eventBus.on('order:loaded', (order) => {
        // Render Source Table
        renderSourceTable(order.list);

        // Render Packaging Table (shared component)
        renderPackagingSummary(order.list);

        // Update Meta
        renderMeta(order);

        // Update Counts in Tabs
        updateTabCounts(order);

        // Analyze for Smart Sidebar
        smartSidebar.analyze(order);

        // Reset PO panels when new order is loaded
        document.getElementById('generatePackagingPOBtn').classList.remove('hidden');
        document.getElementById('packagingPOPanel').classList.add('hidden');
        document.getElementById('packagingPONumber').textContent = '';
        appState.setState({ currentPackagingPO: null });

        // Update overall status
        updateStatus('READY');
    });
}

// ==================== Sub-Routines ====================

async function handleFetch() {
    const input = document.getElementById('orderCodeInput');
    const code = input.value.trim();
    const btn = document.getElementById('searchBtn');
    const errorMsg = document.getElementById('errorMsg');

    if (!code) {
        showError('请输入合同编号');
        return;
    }

    // UI Loading State
    btn.classList.add('loading');
    errorMsg.textContent = '';
    updateStatus('FETCHING');

    try {
        const data = await fetchOrderDetail(code);

        // Adapter for Search Result vs Detail
        // If API returns a search result (rows array), use the first result as the active order
        let orderData = data;
        if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            console.log('📦 Extracting first order from search results');
            orderData = data.rows[0];
        } else if (data.list && Array.isArray(data.list) && data.total === 1 && data.list[0].list) {
            // Handle case where .list is the search result list (rare but possible based on my previous adapter)
            // But based on user log {total: 1, rows: ...}, the above branch should catch it.
        }

        // Deep validation of the specific order object
        if (!orderData || !Array.isArray(orderData.list)) {
            console.error('❌ Data missing "list" array:', orderData);
            throw new Error('订单数据缺少明细列表');
        }

        // Update State
        appState.setState({ currentOrder: orderData });
        eventBus.emit('order:loaded', orderData);

        // Clear error
        errorMsg.textContent = '';
    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message || '查询失败，请检查网络或单号');
        updateStatus('ERROR');
    } finally {
        btn.classList.remove('loading');
    }
}

function switchTab(tabId) {
    // 1. Update Tabs
    document.querySelectorAll('.hub-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabId);
    });

    // 2. Update Panels
    document.querySelectorAll('.hub-panel').forEach(p => {
        // Just toggle active class as CSS handles display properties
        // .hub-panel { display: none } .hub-panel.active { display: block }
        p.classList.toggle('active', p.id === `panel-${tabId}`);
    });
}

function updateStatus(status) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('#workbenchStatus .status-text');
    const footerStatus = document.getElementById('footerStatus');

    // Reset classes
    dot.className = 'status-dot';

    switch (status) {
        case 'IDLE':
            dot.classList.add('idle');
            text.textContent = 'IDLE';
            break;
        case 'FETCHING':
            dot.classList.add('busy'); // busy implies scanning/working
            text.textContent = 'FETCHING...';
            footerStatus.textContent = 'Connecting to Server...';
            break;
        case 'READY':
            dot.classList.add('success');
            text.textContent = 'ACTIVE';
            footerStatus.textContent = 'Data Loaded';
            break;
        case 'ERROR':
            dot.classList.add('error');
            text.textContent = 'ERROR';
            break;
    }
}

function showError(msg) {
    document.getElementById('errorMsg').textContent = msg;
}

// ==================== Renderers ====================

function renderMeta(order) {
    setText('customerName', order.customerName);
    setText('orderCode', order.code);
    setText('orderDate', order.orderDate);
    setText('advanceDate', order.advanceDate);

    // Remark special handling
    const remarkBox = document.getElementById('orderRemark');
    if (order.remark) {
        remarkBox.innerHTML = order.remark;
        remarkBox.classList.remove('placeholder-text');
    } else {
        remarkBox.innerHTML = '<span class="placeholder-text">无备注信息</span>';
    }
}

function updateTabCounts(order) {
    const count = order.list ? order.list.length : 0;

    // Source count
    document.getElementById('sourceCount').textContent = `${count} items`;

    // Packaging count (simplified estimate, real count comes from aggregation)
    // We defer to packagingTable.js to update specific packaging tables, 
    // but the headers might need updating. 
    // Actually renderPackagingSummary updates the TABLE body, but maybe not the badge?
    // Let's simply update source badge for now.
}

function renderSourceTable(items) {
    const tbody = document.getElementById('detailsTableBody');
    const emptyState = document.getElementById('sourceEmptyState');

    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    console.log('🔍 Debug Item Structure:', items[0]);

    items.forEach((item, index) => {
        const row = document.createElement('tr');

        // Parse details
        const detailTags = [];
        if (item.mz) detailTags.push(item.mz);
        if (item.tc) detailTags.push(`填充: ${item.tc}`);
        if (item.xd) detailTags.push(item.xd);

        const detailsHtml = detailTags
            .map(tag => `<span class="detail-tag">${tag}</span>`)
            .join('');

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
            <td style="text-align: center;">
                 <label style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                    <input type="checkbox" class="merge-checkbox" data-index="${index}" style="width: 18px; height: 18px; cursor: pointer;">
                </label>
            </td>
        `;
        tbody.appendChild(row);
    });
}
