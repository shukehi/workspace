/**
 * Workbench Page Controller (Vue 3 + Reactive Store)
 * 
 * Manages the interaction for the Procurement Workbench.
 * Acts as the bridge between global IO (Sidebar/API) and the Vue Store.
 */

import { fetchOrderDetail } from '../services/api.js';
import { appState } from '../core/state.js';
import { eventBus } from '../core/eventBus.js';
import { loadPackagingMapping, loadCylinderMapping, loadLockForkMapping, loadMaterialsCatalog, loadColorFormulas } from '../config/index.js';
import { initNavigation } from '../components/navigation.js';
import { WorkbenchApp } from '../components-vue/WorkbenchApp.js';
import { useOrderStore } from '../store/orderStore.js';

const { createApp, watch } = Vue;
let vueApp = null;
const store = useOrderStore();

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Workbench initializing (Vue 3 Store Mode)...');

    // 1. Init Navigation
    initNavigation();

    // 2. Mount Vue App
    mountVueApp();

    // 3. Load Config
    await loadPackagingMapping();
    await loadCylinderMapping();
    await loadLockForkMapping();
    await loadMaterialsCatalog();
    await loadColorFormulas();
    console.log('✅ Config loaded');

    // 4. Bind UI Events (Sidebar/Command Panel)
    bindEvents();

    // 5. Watch Store for Global Sidebar Updates
    setupStoreWatchers();

    console.log('✅ Workbench ready');
});

// ==================== Vue Integration ====================

function mountVueApp() {
    const app = createApp(WorkbenchApp);
    vueApp = app.mount('#app');
    window.mainVue = vueApp; // Debug
}

function setupStoreWatchers() {
    // Watch store state to update Sidebar Meta (Non-Vue parts)
    watch(() => store.state.orders, (orders) => {
        const current = store.state.currentOrder;
        if (current) {
            updateMeta(current, orders.length);
        }
        updateStatus(orders.length > 0 ? 'READY' : 'IDLE');
    }, { deep: true });
}

// ==================== Event Handlers ====================

function bindEvents() {
    // Command Panel: Fetch Button
    const searchBtn = document.getElementById('searchBtn');
    const orderCodeInput = document.getElementById('orderCodeInput');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleFetch);
    }

    if (orderCodeInput) {
        orderCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleFetch();
        });
    }

    // Append Mode Toggle
    const appendToggle = document.getElementById('appendModeToggle');
    if (appendToggle) {
        appendToggle.addEventListener('change', (e) => {
            appState.setState({ appendMode: e.target.checked });
        });
    }
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
    if (errorMsg) errorMsg.textContent = '';
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
            throw new Error('订单数据缺少明细列表');
        }

        // Check append mode
        const appendMode = appState.get('appendMode');

        if (!appendMode) {
            store.clearOrders();
        }

        try {
            store.addOrder(orderData);
        } catch (e) {
            if (e.message.includes('already exists')) {
                // If exists, maybe we just select it? Or throw error.
                // For now, let's just warn
                console.warn(e.message);
                showError('该订单已在列表中');
            } else {
                throw e;
            }
        }

        if (errorMsg) errorMsg.textContent = '';
        input.value = '';
        updateStatus('READY');

    } catch (error) {
        console.error('Fetch error:', error);
        showError(error.message || '查询失败，请检查网络或单号');
        updateStatus('ERROR');
    } finally {
        btn.classList.remove('loading');
    }
}

function updateStatus(status) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('#workbenchStatus .status-text');
    const footerStatus = document.getElementById('footerStatus');

    if (!dot || !text) return;

    dot.className = 'status-dot';

    switch (status) {
        case 'IDLE':
            dot.classList.add('idle');
            text.textContent = 'IDLE';
            break;
        case 'FETCHING':
            dot.classList.add('busy');
            text.textContent = 'FETCHING...';
            if (footerStatus) footerStatus.textContent = 'Connecting to Server...';
            break;
        case 'READY':
            dot.classList.add('success');
            text.textContent = 'ACTIVE';
            if (footerStatus) footerStatus.textContent = 'Data Loaded';
            break;
        case 'ERROR':
            dot.classList.add('error');
            text.textContent = 'ERROR';
            break;
    }
}

function showError(msg) {
    const el = document.getElementById('errorMsg');
    if (el) el.textContent = msg;
}

function updateMeta(order, orderCount = 1) {
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('customerName', order.customerName);
    setText('orderCode', orderCount > 1 ? `${order.code} (+${orderCount - 1} more)` : order.code);
    setText('orderDate', order.orderDate);
    setText('advanceDate', order.advanceDate);

    // Remark uses innerHTML
    const remarkBox = document.getElementById('orderRemark');
    if (remarkBox) {
        if (order.remark) {
            remarkBox.innerHTML = order.remark;
            remarkBox.classList.remove('placeholder-text');
        } else {
            remarkBox.innerHTML = '<span class="placeholder-text">无备注信息</span>';
        }
    }
}
