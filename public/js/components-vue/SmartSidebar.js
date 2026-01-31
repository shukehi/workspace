const { computed } = Vue;
import { useOrderStore } from '../store/orderStore.js';
import { useOrderAnalysis } from '../composables/useOrderAnalysis.js';

export const SmartSidebar = {
    template: '#smart-sidebar-template',
    setup() {
        const store = useOrderStore();
        const { analyzeOrder } = useOrderAnalysis();

        const alerts = computed(() => {
            const currentOrder = store.state.currentOrder;
            if (!currentOrder) return [];
            return analyzeOrder(currentOrder);
        });

        const hasAlerts = computed(() => alerts.value.length > 0);

        return {
            alerts,
            hasAlerts
        };
    }
};
