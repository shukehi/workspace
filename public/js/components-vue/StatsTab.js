const { computed } = Vue;
import { useOrderStore } from '../store/orderStore.js';

export const StatsTab = {
    template: '#stats-tab-template',
    setup() {
        const store = useOrderStore();

        // Use pre-calculated stats from store (automatic reactivity)
        const stats = computed(() => store.statistics.value);

        const statistics = computed(() => stats.value.colorDistribution);
        const uniqueColors = computed(() => stats.value.totalColors);
        const totalDoors = computed(() => stats.value.totalDoors);

        return {
            statistics,
            uniqueColors,
            totalDoors
        };
    }
};
