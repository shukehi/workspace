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
  assert.equal(resolveOrderStatusLabel(createOrder({ status: 'completed' })), '已完成');
  assert.equal(hasValidDeliveryDate(createOrder()), true);
  assert.equal(hasValidDeliveryDate(createOrder({ delivery_date: '' })), false);
});

test('createProcurementPreview creates snapshot, prints, and exports pdf', async () => {
  const opened: Array<[string, string | undefined, string | undefined]> = [];
  const downloads: Array<{ url: string; data: unknown; filename: string }> = [];
  const toasts: Array<{ title: string; description?: string; variant?: string }> = [];

  const preview = createProcurementPreview({
    order: ref(createOrder()),
    open: ref(true),
    toast: (payload) => {
      toasts.push(payload);
    },
    apiClient: {
      post: async () => ({ snapshotId: 'snapshot-1' }),
      downloadPDF: async (url, data, filename) => {
        downloads.push({ url, data, filename });
      },
    },
    browser: {
      confirm: () => true,
      open: (url?: string | URL, target?: string, features?: string) => {
        opened.push([String(url), target, features]);
        return null;
      }
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
  assert.equal(downloads[0].filename, 'PO-31.pdf');
  assert.equal(toasts.at(-1)?.title, '导出成功');
});
