/**
 * MaterialsTab Component
 * Displays raw material requirements from store
 */

const { computed } = Vue;

import { useOrderStore } from '../store/orderStore.js';

export const MaterialsTab = {
    template: '#materials-tab-template',
    setup() {
        const store = useOrderStore();

        // Directly use pre-calculated materials from store
        return {
            supplierGroups: computed(() => store.materials.value.supplierGroups),
            missingFormulas: computed(() => store.materials.value.missingFormulas),
            hasData: computed(() => store.materials.value.hasData),
            error: computed(() => store.materials.value.error)
        };
    }
};
