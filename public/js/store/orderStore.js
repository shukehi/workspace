
const { reactive, computed, watch } = Vue;

// State - The single source of truth
const state = reactive({
    orders: [],
    currentOrder: null,
    // Global filters or settings could go here
});

// Computed Properties
const mergedItems = computed(() => {
    return state.orders.flatMap(order =>
        (order.list || []).map((item, index) => ({
            ...item,
            _originOrder: order.code,
            _originIndex: index,
            // Default flags if not present
            _excludeStats: item._excludeStats || false,
            // Merge handling could also be here or in controllers
        }))
    );
});

const statistics = computed(() => {
    // Simple recalculation based on mergedItems
    // This replaces orderPool.getStatistics()
    const items = mergedItems.value.filter(i => !i._excludeStats);
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
        // Parse "10+10" or "20"
        if (item.qty) {
            const parts = item.qty.toString().split('+');
            count = parts.reduce((sum, part) => sum + (parseInt(part) || 0), 0);
        }

        totalDoors += count;

        if (!colorMap.has(item.color)) {
            colorMap.set(item.color, { color: item.color, doorCount: 0 });
        }
        colorMap.get(item.color).doorCount += count;
    });

    const totalColors = colorMap.size;
    const colorDistribution = Array.from(colorMap.values())
        .sort((a, b) => b.doorCount - a.doorCount)
        .map(c => ({
            ...c,
            ratio: totalDoors > 0 ? ((c.doorCount / totalDoors) * 100).toFixed(1) : 0
        }));

    return {
        totalColors,
        totalDoors,
        colorDistribution
    };
});

// Persistence
const saveToStorage = () => {
    try {
        localStorage.setItem('vueOrderStore', JSON.stringify(state.orders));
    } catch (e) {
        console.error('Save failed', e);
    }
};

const loadFromStorage = () => {
    try {
        const saved = localStorage.getItem('vueOrderStore');
        if (saved) {
            state.orders = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Load failed', e);
    }
};

// Auto-save
watch(() => state.orders, saveToStorage, { deep: true });

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

    // Toggle stats exclusion for an item
    const toggleItemStats = (orderCode, itemIndex) => {
        const order = state.orders.find(o => o.code === orderCode);
        if (order && order.list && order.list[itemIndex]) {
            order.list[itemIndex]._excludeStats = !order.list[itemIndex]._excludeStats;
        }
    };

    return {
        state,
        mergedItems,
        statistics,
        addOrder,
        removeOrder,
        clearOrders,
        toggleItemStats,
        loadFromStorage
    };
};

export { useOrderStore };
