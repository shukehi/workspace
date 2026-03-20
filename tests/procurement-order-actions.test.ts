import test from 'node:test';
import assert from 'node:assert/strict';
import { useOrderActions } from '../src/features/procurement/composables/useOrderActions';
import type { Order } from '../src/types/order';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 39,
    order_no: 'PO-39',
    supplier: '测试供应商',
    category: '包装',
    status: 'processing',
    total_amount: 100,
    created_at: '2026-03-20T10:00:00.000Z',
    remark: '',
    items: [
      {
        id: 1,
        material_id: 'm1',
        name: '纸箱',
        model: 'M',
        quantity: 1,
        unit: '套',
      }
    ],
    ...overrides,
  };
}

test('useOrderActions markArrived calls the arrive endpoint with POST', async () => {
  const requests: Array<{ url: string; data?: unknown }> = [];
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];
  let refreshCount = 0;

  const actions = useOrderActions({
    toast: (payload) => {
      toasts.push(payload);
    },
    onRefresh: async () => {
      refreshCount += 1;
    },
    apiClient: {
      post: async (url, data) => {
        requests.push({ url, data });
        return {} as any;
      },
      put: async () => {
        throw new Error('markArrived should not use PUT');
      },
      downloadPDF: async () => undefined,
    },
  });

  await actions.markArrived(createOrder());

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/orders/39/arrive');
  assert.match(String((requests[0].data as { arrived_at?: string }).arrived_at || ''), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(refreshCount, 1);
  assert.equal(toasts.at(-1)?.title, '到货登记成功');
});
