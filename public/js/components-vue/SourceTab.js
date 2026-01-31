
const { ref, computed } = Vue;
import { useOrderStore } from '../store/orderStore.js';

export const SourceTab = {
    template: '#source-tab-template',
    setup(props, { emit }) {
        const store = useOrderStore();

        // Use mergedItems from store
        const items = computed(() => store.mergedItems.value);

        const generateOrders = () => {
            emit('generate');
        };

        const handleUpdateItem = (item, key, value) => {
            if (item._originOrder && item._originIndex !== undefined) {
                store.updateItemProp(item._originOrder, item._originIndex, key, value);
            }
        };

        return {
            items,
            generateOrders,
            handleUpdateItem
        };
    }
};
