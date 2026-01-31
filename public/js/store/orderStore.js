const { reactive, computed, watch } = Vue;

import { calculateMaterialRequirements, getMaterialsForUI } from '../utils/materialDecomposer.js';
import { MATERIALS_CATALOG, COLOR_FORMULAS } from '../config/index.js';

// State - The single source of truth
const state = reactive({
    orders: [],
    purchaseOrders: [], // Persisted POs
    currentOrder: null,
    // Global filters or settings could go here
});

// Computed Properties
const mergedItems = computed(() => {
    return state.orders.flatMap(order =>
        (order.list || []).map((item, index) => {
            // Ensure flags exist with defaults
            if (item.includeStats === undefined) item.includeStats = false;
            if (item.merge === undefined) item.merge = false;

            return {
                ...item,
                _originOrder: order.code,
                _originIndex: index,
                sourceOrder: order.code, // Add sourceOrder for display in SOURCE tab
            };
        })
    );
});

const statistics = computed(() => {
    // Simple recalculation based on mergedItems
    // This replaces orderPool.getStatistics()
    // Only include items where includeStats is true
    const items = mergedItems.value.filter(i => i.includeStats);
    const colorMap = new Map();
    let totalDoors = 0;

    items.forEach(item => {
        if (!item.color) return;

        // Count Logic (Simplified for demo, matching legacy approximate logic)
        // Legacy: uses item.qty left+right or just 1? 
        // Let's assume item.qty is parsed or we just count lines for now or assume calculated

        // Re-implementing simplified logic from legacy statisticsCalculator.js
        // If complex logic is needed, we should import that calculator
        // For now, let's just count occurrences of color for "Distribution"

        let count = 0;
        // Parse "10+10" or "20" or "5/20" format
        if (item.qty) {
            const qtyStr = item.qty.toString();
            if (qtyStr.includes('/')) {
                // Format: "5/20" (left/right)
                const parts = qtyStr.split('/');
                count = parts.reduce((sum, part) => sum + (parseInt(part) || 0), 0);
            } else if (qtyStr.includes('+')) {
                // Format: "10+10"
                const parts = qtyStr.split('+');
                count = parts.reduce((sum, part) => sum + (parseInt(part) || 0), 0);
            } else {
                // Simple number
                count = parseInt(qtyStr) || 0;
            }
        }

        totalDoors += count;

        if (!colorMap.has(item.color)) {
            colorMap.set(item.color, { color: item.color, count: 0 });
        }
        colorMap.get(item.color).count += count;
    });

    const totalColors = colorMap.size;
    const colorDistribution = Array.from(colorMap.values())
        .sort((a, b) => b.count - a.count)
        .map(c => ({
            ...c,
            percentage: totalDoors > 0 ? ((c.count / totalDoors) * 100).toFixed(1) : 0
        }));

    return {
        totalColors,
        totalDoors,
        colorDistribution
    };
});

// Materials - Calculate raw material requirements (Clean Version)
const materials = computed(() => {
    const items = mergedItems.value;

    // Early return if dependencies missing
    if (!items?.length || !COLOR_FORMULAS || !MATERIALS_CATALOG) {
        return {
            supplierGroups: [],
            missingFormulas: [],
            hasData: false,
            error: null
        };
    }

    try {
        // Delegate calculation and formatting to util
        const result = getMaterialsForUI(items, COLOR_FORMULAS, MATERIALS_CATALOG);
        return { ...result, error: null };
    } catch (error) {
        console.error('Material calculation error:', error);
        return {
            supplierGroups: [],
            missingFormulas: [],
            hasData: false,
            error: error.message || 'Error executing material calculation'
        };
    }
});

// Persistence
let saveTimeout;
const saveToStorage = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const dataToSave = {
                orders: state.orders,
                purchaseOrders: state.purchaseOrders
            };
            localStorage.setItem('vueOrderStore', JSON.stringify(dataToSave));
            console.log('💾 Store auto-saved');
        } catch (e) {
            console.error('Save failed', e);
        }
    }, 500); // Debounce 500ms
};

const loadFromStorage = () => {
    try {
        const saved = localStorage.getItem('vueOrderStore');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Support both old array format and new object format
            if (Array.isArray(parsed)) {
                state.orders = parsed;
            } else {
                state.orders = parsed.orders || [];
                state.purchaseOrders = parsed.purchaseOrders || [];
            }
        }
    } catch (e) {
        console.error('Load failed', e);
    }
};

// Auto-save
watch(() => [state.orders, state.purchaseOrders], saveToStorage, { deep: true });

// Actions
const useOrderStore = () => {

    const addOrder = (order) => {
        // Validation / Duplication check
        const exists = state.orders.find(o => o.code === order.code);
        if (exists) {
            throw new Error(`Order ${order.code} already exists`);
        }

        // Deep copy to avoid reference issues
        state.orders.push(JSON.parse(JSON.stringify(order)));
        state.currentOrder = order;
    };

    const removeOrder = (orderCode) => {
        state.orders = state.orders.filter(o => o.code !== orderCode);
        if (state.currentOrder && state.currentOrder.code === orderCode) {
            state.currentOrder = state.orders.length > 0 ? state.orders[state.orders.length - 1] : null;
        }
    };

    const clearOrders = () => {
        state.orders = [];
        state.currentOrder = null;
    };

    return {
        state,
        mergedItems,
        statistics,
        materials,
        addOrder,
        removeOrder,
        clearOrders,
        loadFromStorage,
        // PO Actions
        addPO: (po) => state.purchaseOrders.unshift(po),
        deletePO: (id) => { state.purchaseOrders = state.purchaseOrders.filter(p => p.id !== id); },
        clearPOs: () => { state.purchaseOrders = []; },

        // Item Actions
        updateItemProp: (orderCode, itemIndex, key, value) => {
            const order = state.orders.find(o => o.code === orderCode);
            if (order && order.list && order.list[itemIndex]) {
                order.list[itemIndex][key] = value;
                // Trigger save/reactivity strictly
                state.orders = [...state.orders];
            }
        }
    };
};

export { useOrderStore };
