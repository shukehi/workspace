import type { Ref } from 'vue';

export interface SourceOrderContractStateRefs {
  currentOrder: Ref<any>;
}

export function assertSourceOrderData(orderData: any) {
  if (!orderData || !Array.isArray(orderData.list)) {
    throw new Error('Contract not found or empty');
  }
}

export function applySourceOrderContractData(
  state: SourceOrderContractStateRefs,
  orderData: any,
  persistSourceOrderSnapshot: (orderData: any) => void,
) {
  assertSourceOrderData(orderData);
  state.currentOrder.value = orderData;
  persistSourceOrderSnapshot(orderData);
}

export function clearSourceOrderContractData(state: SourceOrderContractStateRefs) {
  state.currentOrder.value = null;
}
