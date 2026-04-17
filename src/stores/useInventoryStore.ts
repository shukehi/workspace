import { defineStore } from 'pinia';
import { createInventoryStoreActions } from '@/features/inventory/inventoryStoreActions';
import { createInventoryStoreState } from '@/features/inventory/inventoryStoreState';

export const useInventoryStore = defineStore('inventory', () => {
    const state = createInventoryStoreState();
    const actions = createInventoryStoreActions(state);

    return {
        ...state,
        ...actions,
    };
});
