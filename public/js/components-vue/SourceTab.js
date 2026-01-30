
const { ref, computed } = Vue;
import { useOrderStore } from '../store/orderStore.js';

export const SourceTab = {
    template: '#source-tab-template',
    setup(props, { emit }) {
        const store = useOrderStore();

        // Use mergedItems from store
        const items = computed(() => store.mergedItems.value);

        const handleToggleStats = (orderCode, itemIndex) => {
            store.toggleItemStats(orderCode, itemIndex);
        };

        const generateOrders = () => {
            emit('generate');
        };

        return {
            items,
            handleToggleStats,
            generateOrders
        };
    }
};
