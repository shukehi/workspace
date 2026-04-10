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

test('useOrderActions performCopyScreenshot writes screenshot image to clipboard', async () => {
  const requests: Array<{ kind: 'post' | 'postBlob'; url: string; data?: unknown }> = [];
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];
  const clipboardWrites: any[] = [];

  class FakeClipboardItem {
    payload: Record<string, Blob | string | PromiseLike<Blob | string>>;
    constructor(payload: Record<string, Blob | string | PromiseLike<Blob | string>>) {
      this.payload = payload;
    }
  }

  const actions = useOrderActions({
    toast: (payload) => {
      toasts.push(payload);
    },
    apiClient: {
      post: async (url, data) => {
        requests.push({ kind: 'post', url, data });
        return { snapshotId: 'snapshot-copy-1' } as any;
      },
      postBlob: async (url, data) => {
        requests.push({ kind: 'postBlob', url, data });
        return new Blob(['fake-image'], { type: 'image/png' });
      },
      downloadPDF: async () => undefined,
    },
    browser: {
      confirm: () => true,
      open: () => null,
      clipboard: {
        write: async (items: any[]) => {
          clipboardWrites.push(items);
        },
      },
      ClipboardItem: FakeClipboardItem as any,
    },
  });

  await actions.performCopyScreenshot(createOrder({ order_no: 'PO-COPY-001' }), 'compact');

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, '/print/snapshots');
  assert.equal(requests[1].url, '/pdf/screenshot');
  assert.equal((requests[1].data as any).snapshotId, 'snapshot-copy-1');
  assert.equal((requests[1].data as any).printMode, 'compact');
  assert.equal(clipboardWrites.length, 1);

  const clipboardItem = clipboardWrites[0][0] as FakeClipboardItem;
  assert.ok(clipboardItem.payload['image/png']);
  assert.equal('text/plain' in clipboardItem.payload, false);
  assert.equal('text/html' in clipboardItem.payload, false);
  assert.equal(toasts.at(-1)?.title, '截图已复制');
});
