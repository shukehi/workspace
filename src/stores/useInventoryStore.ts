import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { InventoryItem } from '@/types/inventory';

export const useInventoryStore = defineStore('inventory', () => {
    const items = ref<InventoryItem[]>([]);

    return { items };
});
