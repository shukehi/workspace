import { failSourceOrderRequest, type SourceOrderRequestStateRefs } from './sourceOrderRequestStateApplier';

export function failSourceOrderFetch(
  state: SourceOrderRequestStateRefs,
  error: unknown,
  log: (message: string, error: unknown) => void = (message, err) => console.error(message, err),
) {
  log('Fetch failed', error);
  const message = error instanceof Error ? error.message : 'Failed to fetch contract';
  failSourceOrderRequest(state, message || 'Failed to fetch contract');
}

export function failSourceOrderHistoryLoad(
  state: SourceOrderRequestStateRefs,
  error: any,
  log: (message: string, error: unknown) => void = (message, err) => console.error(message, err),
) {
  log('Load history contract failed', error);
  const message = error?.response?.status === 404
    ? '未找到历史合同'
    : (error?.message || '历史合同加载失败，请稍后重试');
  failSourceOrderRequest(state, message);
  return message;
}
