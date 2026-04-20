import type { Ref } from 'vue';

export interface SourceOrderRequestStateRefs {
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

export function beginSourceOrderRequest(state: SourceOrderRequestStateRefs) {
  state.loading.value = true;
  state.error.value = null;
}

export function failSourceOrderRequest(
  state: SourceOrderRequestStateRefs,
  message: string,
) {
  state.error.value = message;
}

export function finishSourceOrderRequest(state: SourceOrderRequestStateRefs) {
  state.loading.value = false;
}
