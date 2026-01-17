/**
 * Workbench Page Controller
 * 
 * Manages the interaction for the Procurement Workbench (Plan C).
 * Handles tab switching, data fetching, and coordination of sub-modules.
 */

import { fetchOrderDetail } from '../services/api.js';
import { appState } from '../core/state.js';
import { eventBus } from '../core/eventBus.js';
import { loadPackagingMapping, loadCylinderMapping, loadLockForkMapping, loadMaterialsCatalog, loadColorFormulas, MATERIALS_CATALOG, COLOR_FORMULAS } from '../config/index.js';
import { initNavigation } from '../components/navigation.js';
import { parseQuantityPair } from '../utils/parsers.js';
import { setText } from '../utils/dom.js';
import { smartSidebar } from '../components/SmartSidebar.js';
import { generatePurchaseOrder, updatePOStatus, listPurchaseOrders, deletePurchaseOrder } from '../components/purchaseOrder.js';
import { getExtractor } from '../utils/dataExtractors.js';
import { tryMergeItems } from '../components/print/printMerge.js';
import { orderPool } from '../utils/orderPool.js';
import { calculateMaterialRequirements, getMaterialSummary } from '../utils/materialDecomposer.js';

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Workbench initializing...');

    // 1. Init Navigation
    initNavigation();

    // 2. Load Config
    await loadPackagingMapping();
    await loadCylinderMapping();
    await loadLockForkMapping();
    await loadMaterialsCatalog();
    await loadColorFormulas();
    console.log('✅ Config loaded');

    // 3. Bind UI Events
    bindEvents();

    // 4. Listen to Global Events (MUST be before loading saved data)
    setupEventSubscriptions();

    // 5. Load saved order pool
    orderPool.load();
    if (orderPool.getAll().length > 0) {
        console.log(`📂 Restored ${orderPool.getAll().length} orders from localStorage`);
        // Sync with state
        appState.setState({
            loadedOrders: orderPool.getAll(),
            currentOrder: orderPool.getCurrent()
        });
        // Trigger UI update
        eventBus.emit('orders:updated');
    }

    // 6. Render PO List
    renderPOList();

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

    // Generate Orders Button - Open Modal
    document.getElementById('generateOrdersBtn').addEventListener('click', () => {
        const currentOrder = appState.get('currentOrder');
        if (!currentOrder) {
            showError('请先加载订单数据');
            return;
        }
        openCategoryModal();
    });

    // Append Mode Toggle
    document.getElementById('appendModeToggle').addEventListener('change', (e) => {
        appState.setState({ appendMode: e.target.checked });
        console.log('📌 Append mode:', e.target.checked ? 'ON' : 'OFF');
    });

    // Modal Events
    bindModalEvents();

    // Sidebar: Status (Demo interaction)
    const statusIndicator = document.getElementById('workbenchStatus');
    statusIndicator.addEventListener('click', () => {
        const dot = statusIndicator.querySelector('.status-dot');
        dot.classList.toggle('idle');
        dot.classList.toggle('busy');
        statusIndicator.querySelector('.status-text').textContent =
            dot.classList.contains('idle') ? 'IDLE' : 'PROCESSING';
    });
}


// ==================== Modal Functions ====================

function bindModalEvents() {
    const modal = document.getElementById('categoryModal');
    const closeBtn = document.getElementById('modalCloseBtn');
    const overlay = modal.querySelector('.modal-overlay');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const confirmBtn = document.getElementById('confirmGenerateBtn');

    // Close modal
    const closeModal = () => {
        modal.classList.add('hidden');
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Select all categories
    selectAllBtn.addEventListener('click', () => {
        const checkboxes = modal.querySelectorAll('input[name="category"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        checkboxes.forEach(cb => cb.checked = !allChecked);
        selectAllBtn.textContent = allChecked ? '全选' : '取消全选';
    });

    // Confirm generate
    confirmBtn.addEventListener('click', async () => {
        const checkboxes = modal.querySelectorAll('input[name="category"]:checked');
        const selectedCategories = Array.from(checkboxes).map(cb => cb.value);

        if (selectedCategories.length === 0) {
            showError('请至少选择一个类别');
            return;
        }

        closeModal();
        await handleBatchGenerate(selectedCategories);
    });
}

function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    modal.classList.remove('hidden');
}

async function handleBatchGenerate(selectedCategories) {
    const currentOrder = appState.get('currentOrder');

    try {
        updateStatus('FETCHING');

        // Capture merge selections
        const checkboxes = document.querySelectorAll('.merge-checkbox');
        const mergeFlags = Array.from(checkboxes).map(cb => cb.checked);

        // Prepare data (deep copy)
        const orderData = JSON.parse(JSON.stringify(currentOrder));

        // Tag items with merge flags
        if (orderData.list) {
            orderData.list.forEach((item, idx) => {
                item._allowMerge = mergeFlags[idx] || false;
            });
        }

        // Generate POs for each selected category
        const generatedPOs = [];

        for (const category of selectedCategories) {
            // Clone order data for this category to avoid side-effects
            const categoryOrderData = JSON.parse(JSON.stringify(orderData));

            // Apply category-specific merge logic
            // We assume if users checked "merge" boxes, they WANT merging
            // The merge logic now respects the category (e.g., Packaging ignores SX)
            const { reducedList, canMerge } = tryMergeItems(categoryOrderData.list, category);

            if (canMerge) {
                console.log(`🔹 Merging items for category: ${category}`);
                categoryOrderData.list = reducedList;
            }

            const extractor = getExtractor(category);
            // Extract data from the (potentially merged) list
            // Pass order info for cylinder mapping (customer name needed for requirements)
            const orderInfo = {
                customerName: categoryOrderData.customerName,
                code: categoryOrderData.code,
                remark: categoryOrderData.remark
            };
            const data = await extractor(categoryOrderData.list, orderInfo);

            const po = generatePurchaseOrder(categoryOrderData, data, mergeFlags, category);
            generatedPOs.push(po);
        }

        console.log(`✅ Generated ${generatedPOs.length} POs:`, generatedPOs.map(po => po.poNumber));

        // Switch to ORDERS tab
        switchTab('orders');

        // Refresh PO list
        renderPOList();

        updateStatus('READY');

    } catch (error) {
        console.error('❌ Batch generation failed:', error);
        showError('批量生成失败，请重试');
        updateStatus('ERROR');
    }
}



function setupEventSubscriptions() {
    // Listen for multi-order updates
    eventBus.on('orders:updated', () => {
        // Get merged items from pool
        const mergedItems = orderPool.getMergedItems();
        const orders = orderPool.getAll();

        // Render Source Table with merged data
        renderSourceTable(mergedItems);

        // Update Meta (show most recent order or summary)
        if (orders.length > 0) {
            const mostRecent = orderPool.getCurrent();
            renderMeta(mostRecent, orders.length);
        }

        // Update Counts in Tabs
        updateTabCounts({ list: mergedItems });

        // Render loaded sources panel
        renderLoadedSources(orders);

        // Analyze for Smart Sidebar (use most recent order)
        if (orders.length > 0) {
            smartSidebar.analyze(orderPool.getCurrent());
        }

        // Calculate and render statistics from pool (with caching)
        renderStatistics();

        // Calculate and render materials
        renderMaterials();

        // Update overall status
        updateStatus('READY');
    });

    // Keep backward compatibility with old event (for other components)
    eventBus.on('order:loaded', (order) => {
        // This is now handled by orders:updated
        console.log('⚠️ Deprecated event: order:loaded');
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
        let orderData = data;
        if (data.rows && Array.isArray(data.rows) && data.rows.length > 0) {
            console.log('📦 Extracting first order from search results');
            orderData = data.rows[0];
        }

        // Deep validation
        if (!orderData || !Array.isArray(orderData.list)) {
            console.error('❌ Data missing "list" array:', orderData);
            throw new Error('订单数据缺少明细列表');
        }

        // Check append mode
        const appendMode = appState.get('appendMode');

        if (appendMode) {
            // Append mode: add to pool
            try {
                orderPool.add(orderData);
            } catch (error) {
                // Handle duplicate or invalid order
                showError(error.message);
                updateStatus('ERROR');
                return;
            }
        } else {
            // Replace mode: clear and set single order
            orderPool.replace(orderData);
        }

        // Save pool to localStorage
        orderPool.save();

        // Update state (for backward compatibility)
        appState.setState({
            loadedOrders: orderPool.getAll(),
            currentOrder: orderPool.getCurrent()
        });

        // Emit event
        eventBus.emit('orders:updated');

        // Clear error and input
        errorMsg.textContent = '';
        input.value = '';
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

function renderMeta(order, orderCount = 1) {
    setText('customerName', order.customerName);
    setText('orderCode', orderCount > 1 ? `${order.code} (+${orderCount - 1} more)` : order.code);
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

function renderLoadedSources(orders = []) {
    const container = document.getElementById('sourcesList');

    if (orders.length === 0) {
        container.innerHTML = '<div class="sources-list-empty">暂无已加载订单</div>';
        return;
    }

    container.innerHTML = orders.map(order => `
        <div class="source-tag">
            <span class="source-tag-code">${order.code}</span>
            <button class="source-tag-remove" onclick="handleRemoveOrder('${order.code}')">×</button>
        </div>
    `).join('');
}

window.handleRemoveOrder = function (orderCode) {
    orderPool.remove(orderCode);
    orderPool.save();

    // Update state (for backward compatibility)
    appState.setState({
        loadedOrders: orderPool.getAll(),
        currentOrder: orderPool.getCurrent()
    });

    eventBus.emit('orders:updated');
};

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
            <td style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">
                ${item._originOrder || '-'}
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

// ==================== Statistics Renderer ====================

function renderStatistics() {
    // Get cached statistics from pool
    const stats = orderPool.getStatistics();

    // Update metrics
    document.getElementById('statsTotalColors').textContent = stats.totalColors;
    document.getElementById('statsTotalDoors').textContent = stats.totalDoors;
    document.getElementById('statsColorCount').textContent = `${stats.totalColors} 种颜色`;

    // Render table
    const tbody = document.getElementById('statsTableBody');
    const emptyState = document.getElementById('statsEmptyState');

    if (stats.totalColors === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = stats.colorDistribution.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td class="color-name">${item.color}</td>
            <td class="door-count">${item.doorCount}</td>
            <td>
                <div class="ratio-bar">
                    <div class="ratio-progress">
                        <div class="ratio-fill" style="width: ${item.ratio}%"></div>
                    </div>
                    <span class="ratio-text">${item.ratio}%</span>
                </div>
            </td>
        </tr>
    `).join('');
}

// ==================== PO List Management ====================

function renderPOList() {
    const allPOs = listPurchaseOrders();
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('ordersEmptyState');
    const countBadge = document.getElementById('ordersCount');

    // Update count
    countBadge.textContent = `${allPOs.length} 单`;

    if (allPOs.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';

    tbody.innerHTML = allPOs.map(po => `
        <tr>
            <td>${po.poNumber}</td>
            <td><span class="category-badge">${getCategoryLabel(po.category)}</span></td>
            <td>${po.order?.customerName || '-'}</td>
            <td>${po.order?.code || '-'}</td>
            <td>${formatDate(po.createdAt)}</td>
            <td><span class="status-badge ${po.status}">${getStatusLabel(po.status)}</span></td>
            <td>
                <div class="action-btns">
                    <button onclick="viewPO('${po.poNumber}')">查看</button>
                    <button onclick="printPO('${po.poNumber}')">打印</button>
                    <button onclick="exportPDF('${po.poNumber}')">PDF</button>
                    <button class="danger" onclick="handleDeletePO('${po.poNumber}')">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Make functions global for onclick handlers
window.viewPO = function (poNumber) {
    const po = listPurchaseOrders().find(p => p.poNumber === poNumber);
    if (!po) return;

    const orderForPrint = {
        ...po.order,
        list: po.items
    };

    localStorage.setItem('_order_preview_data', JSON.stringify(orderForPrint));
    localStorage.setItem('_order_preview_po_number', po.poNumber);
    localStorage.setItem('_order_preview_category', po.category);

    window.open(
        '/order-preview.html',
        '_blank',
        'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no'
    );
};

window.printPO = function (poNumber) {
    // Set auto-print flag before opening preview
    localStorage.setItem('_order_preview_auto_print', 'true');
    viewPO(poNumber);
    updatePOStatus(poNumber, 'printed');
    renderPOList();
};

window.exportPDF = async function (poNumber) {
    const po = listPurchaseOrders().find(p => p.poNumber === poNumber);
    if (!po) return;

    try {
        // Prepare request body
        const requestBody = {
            poNumber: po.poNumber,
            title: po.category === 'cylinder' ? '锁芯采购订单' : '包装采购订单',
            order: {
                customerName: po.order.customerName,
                code: po.order.code,
                orderDate: po.order.orderDate,
                advanceDate: po.order.advanceDate,
                remark: po.order.remark,
                list: po.items // Default
            }
        };

        // Adapter for Cylinder Data
        if (po.category === 'cylinder') {
            console.log('🔄 Adapting Cylinder data for PDF export...');
            requestBody.order.list = po.items.map(item => ({
                productModelName: item.type,       // 锁芯型号 -> 产品名称
                spec: item.eccentricity,           // 偏心参数 -> 规格尺寸
                qty: item.quantity,                // 总数量 -> 数量
                mb: item.supplier,                 // 供应商 -> 门板 (借用显示)
                xsbz: item.remark,                 // 备注 -> 备注
                ...item                            // Keep original fields
            }));
        }


        // Debug: 查看发送的数据
        console.log('📤 PDF Export Request:', {
            poNumber: requestBody.poNumber,
            listLength: requestBody.order.list?.length,
            listSample: requestBody.order.list?.[0]
        });

        const response = await fetch('/api/pdf/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error('PDF 生成失败');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${po.poNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        updatePOStatus(poNumber, 'exported');
        renderPOList();
    } catch (error) {
        console.error('PDF export failed:', error);
        alert('PDF 导出失败');
    }
};

window.handleDeletePO = function (poNumber) {
    if (confirm(`确定要删除采购单 ${poNumber} 吗？`)) {
        deletePurchaseOrder(poNumber);
        renderPOList();
    }
};

function getCategoryLabel(category) {
    const labels = {
        packaging: '包装',
        cylinder: '锁芯',
        hardware: '五金',
        lock: '锁叉'
    };
    return labels[category] || category;
}

function getStatusLabel(status) {
    const labels = {
        generated: '已生成',
        printed: '已打印',
        exported: '已导出'
    };
    return labels[status] || status;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== Materials Renderer ====================

function renderMaterials() {
    const items = orderPool.getMergedItems();
    const formulas = COLOR_FORMULAS;
    const catalog = MATERIALS_CATALOG;

    const container = document.getElementById('materialsContainer');
    const emptyState = document.getElementById('materialsEmptyState');

    if (items.length === 0 || Object.keys(formulas).length === 0 || Object.keys(catalog).length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    try {
        const requirements = calculateMaterialRequirements(items, formulas, catalog);

        if (Object.keys(requirements).length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">暂无可计算的原材料数据</div>';
            emptyState.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = Object.entries(requirements).map(([supplier, group]) => `
            <div class="supplier-group">
                <div class="supplier-header">供应商: ${group.supplierName} (${group.totalItems} 种材料)</div>
                <table class="materials-table">
                    <thead>
                        <tr>
                            <th>材料类型</th>
                            <th>型号</th>
                            <th>总用量</th>
                            <th>单位</th>
                            <th>最小起订</th>
                            <th>包装规格</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.materials.map(m => `
                            <tr>
                                <td class="material-type">${m.material.type}</td>
                                <td>${m.material.name}</td>
                                <td class="material-usage">${m.totalUsage.toFixed(2)}</td>
                                <td>${m.material.unit}</td>
                                <td>${m.material.minOrder || '-'}</td>
                                <td>${m.material.packageSpec || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('');

    } catch (error) {
        console.error('Material calculation error:', error);
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: red;">原材料计算出错，请检查配置</div>';
        emptyState.style.display = 'none';
    }
}

// ==================== Message Listener for PO Updates ====================

window.addEventListener('message', (event) => {
    if (event.data.type === 'PO_UPDATED') {
        console.log('📨 收到 PO 更新通知:', event.data.poNumber);
        renderPOList(); // Refresh the list
    }
});
