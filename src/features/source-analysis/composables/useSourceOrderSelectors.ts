import { computed, type Ref } from 'vue';

export function useSourceOrderSelectors(currentOrder: Ref<any>) {
  const hasOrder = computed(() => !!currentOrder.value);
  const orderItems = computed(() => currentOrder.value?.list || []);

  return {
    hasOrder,
    orderItems,
  };
}
