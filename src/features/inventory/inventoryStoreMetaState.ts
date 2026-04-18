import { ref } from 'vue';

export function createInventoryMetaState() {
  const loading = ref(false);
  const receiptsLoading = ref(false);
  const locationsLoading = ref(false);
  const outboundsLoading = ref(false);
  const movementsLoading = ref(false);

  const receiptsTotal = ref(0);
  const receiptsPage = ref(1);
  const receiptsPageSize = ref(50);
  const outboundsTotal = ref(0);
  const outboundsPage = ref(1);
  const outboundsPageSize = ref(50);
  const movementsTotal = ref(0);
  const movementsPage = ref(1);
  const movementsPageSize = ref(20);

  return {
    loading,
    receiptsLoading,
    locationsLoading,
    outboundsLoading,
    movementsLoading,
    receiptsTotal,
    receiptsPage,
    receiptsPageSize,
    outboundsTotal,
    outboundsPage,
    outboundsPageSize,
    movementsTotal,
    movementsPage,
    movementsPageSize,
  };
}
