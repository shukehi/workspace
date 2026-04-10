import test from 'node:test';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { createProcurementPreview, hasValidDeliveryDate, resolveOrderCategoryLabel, resolveOrderStatusLabel } from '../src/features/procurement/useProcurementPreview';
import type { Order } from '../src/types/order';

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 31,
    order_no: 'PO-31',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    total_amount: 100,
    created_at: '2026-03-09T10:00:00.000Z',
    delivery_date: '2026-03-12T10:00:00.000Z',
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
    metadata: {
      printColumnWidths: {
        no: 40,
        productModelName: 200,
        spec: 150,
        mb: 80,
        qtyLeft: 70,
        qtyRight: 70,
        remark: 160,
      },
    },
    ...overrides,
  };
}

test('preview helpers resolve category, status, and delivery date validity', () => {
  assert.equal(resolveOrderCategoryLabel(createOrder({ category: '锁芯' })), '锁芯');
  assert.equal(resolveOrderCategoryLabel(createOrder({ category: 'lockset' })), '锁具');
  assert.equal(resolveOrderCategoryLabel(createOrder({ category: '配件' })), '五金');
  assert.equal(resolveOrderStatusLabel(createOrder({ status: 'arrived' })), '已到货');
  assert.equal(resolveOrderStatusLabel(createOrder({ status: 'completed' })), '已入库');
  assert.equal(hasValidDeliveryDate(createOrder()), true);
  assert.equal(hasValidDeliveryDate(createOrder({ delivery_date: '' })), false);
});

test('createProcurementPreview creates snapshot, prints, and exports pdf', async () => {
  const opened: Array<[string, string | undefined, string | undefined]> = [];
  const downloads: Array<{ url: string; data: unknown; filename: string }> = [];
  const clipboardWrites: any[] = [];
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];

  class FakeClipboardItem {
    payload: Record<string, Blob | string | PromiseLike<Blob | string>>;
    constructor(payload: Record<string, Blob | string | PromiseLike<Blob | string>>) {
      this.payload = payload;
    }
  }

  const preview = createProcurementPreview({
    order: ref(createOrder()),
    open: ref(true),
    toast: (payload) => {
      toasts.push(payload);
    },
    apiClient: {
      post: async () => ({ snapshotId: 'snapshot-1' }) as any,
      postBlob: async () => new Blob(['fake-image'], { type: 'image/png' }),
      downloadPDF: async (url, data, filename) => {
        downloads.push({ url, data, filename });
      },
    },
    browser: {
      confirm: () => true,
      open: (url?: string | URL, target?: string, features?: string) => {
        opened.push([String(url), target, features]);
        return null;
      },
      clipboard: {
        write: async (items: any[]) => {
          clipboardWrites.push(items);
        },
      },
      ClipboardItem: FakeClipboardItem as any,
    }
  });

  await preview.handlePrint();
  assert.equal(opened.length, 1);
  assert.match(opened[0][0], /snapshotId=snapshot-1/);
  assert.match(opened[0][0], /printMode=signature/);

  preview.handlePrintModeChange('compact');
  await preview.handleExportPdf();
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].url, '/pdf/generate');
  assert.equal(downloads[0].filename, '测试供应商 包装 PO-31 颐家采购订单.pdf');
  assert.equal(toasts.at(-1)?.title, '导出成功');

  await preview.handleCopyScreenshot();
  assert.equal(clipboardWrites.length, 1);
  const clipboardItem = clipboardWrites[0][0] as FakeClipboardItem;
  assert.ok(clipboardItem.payload['image/png']);
  assert.ok(clipboardItem.payload['text/plain']);
  assert.ok(clipboardItem.payload['text/html']);
  assert.equal(toasts.at(-1)?.title, '截图与订单号已复制');
});
