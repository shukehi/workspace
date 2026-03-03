import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useOrderStore } from './useOrderStore';
import { useProcurementStore } from './useProcurementStore';
import { useInventoryStore } from './useInventoryStore';

export const useStatisticsStore = defineStore('statistics', () => {
    const orderStore = useProcurementStore();
    const inventoryStore = useInventoryStore();

    // --- Aggregated Metrics ---
    const totalSpent = computed(() => {
        return orderStore.purchaseOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    });

    const pendingOrdersCount = computed(() => {
        return orderStore.purchaseOrders.filter(o => ['draft', 'submitted', 'processing'].includes(o.status)).length;
    });

    const inventoryHealth = computed(() => {
        const total = inventoryStore.items.length;
        if (total === 0) return 100;
        const low = inventoryStore.lowStockItems.length;
        return Math.round(((total - low) / total) * 100);
    });

    // --- Distribution Data ---
    const categoryStats = computed(() => {
        const stats: Record<string, { count: number; amount: number }> = {};
        orderStore.purchaseOrders.forEach(o => {
            const cat = o.category || '常规';
            if (!stats[cat]) stats[cat] = { count: 0, amount: 0 };
            stats[cat].count++;
            stats[cat].amount += (o.total_amount || 0);
        });
        return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
    });

    const statusStats = computed(() => {
        const statuses = ['draft', 'submitted', 'processing', 'completed', 'cancelled'];
        return statuses.map(status => ({
            status,
            count: orderStore.purchaseOrders.filter(o => o.status === status).length
        }));
    });

    // --- Top Items ---
    const topMaterials = computed(() => {
        // Simple heuristic: most frequently occurring models in orders
        const counts: Record<string, number> = {};
        orderStore.purchaseOrders.forEach(o => {
            o.items?.forEach(item => {
                counts[item.model] = (counts[item.model] || 0) + (item.quantity || 0);
            });
        });
        return Object.entries(counts)
            .map(([model, qty]) => ({ model, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    });

    return {
        totalSpent,
        pendingOrdersCount,
        inventoryHealth,
        categoryStats,
        statusStats,
        topMaterials
    };
});
