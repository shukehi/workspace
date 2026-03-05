import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProcurementDoc } from '../src/features/procurement/buildProcurementDoc';

test('buildProcurementDoc: packaging uses fallback fields and computes left/right totals', () => {
  const doc = buildProcurementDoc({
    code: 'PO-001',
    customerName: '客户A',
    orderDate: '2026-03-05T01:02:03.000Z',
    deliveryDate: '2026-03-12T00:00:00.000Z',
    printColumnWidths: {
      no: 44,
      productModelName: 220,
      spec: 170,
      mb: 74,
      qtyLeft: 74,
      qtyRight: 74,
      remark: 180
    },
    list: [
      {
        name: '外门板',
        model: 'M-01',
        orientation: '左',
        quantity_left: 2,
        quantity_right: 3,
        supplier: '供应商1',
        internal_name: 'A箱',
        external_name: 'A-外协'
      },
      {
        name: '外门板',
        model: 'M-02',
        orientation: '右',
        quantity_left: 1,
        quantity_right: 0,
        supplier: '供应商1',
        internal_name: 'A箱',
        external_name: 'A-外协'
      }
    ]
  }, {
    category: 'packaging',
    mode: 'signature',
    packagingMapping: { mappings: { A箱: 'A-外协' }, supplierName: '默认供应商' }
  });

  assert.equal(doc.pages.length, 1);
  const page = doc.pages[0];
  assert.equal(page.code, 'PO-001');
  assert.equal(page.orderDate, '2026-03-05');
  assert.equal(page.deliveryDate, '2026-03-12');

  const firstRow = page.rows[0];
  assert.equal(firstRow.values.spec, 'M-01');
  assert.equal(firstRow.values.mb, '左');

  const totalRow = page.rows[page.rows.length - 1];
  assert.equal(totalRow.rowType, 'total');
  assert.equal(totalRow.values.qtyLeft, 3);
  assert.equal(totalRow.values.qtyRight, 3);
});

test('buildProcurementDoc: non-packaging groups by category config and computes quantity total', () => {
  const doc = buildProcurementDoc({
    order_no: 'PO-LOCK-1',
    supplier: '锁叉供应商',
    created_at: '2026-03-01T00:00:00.000Z',
    items: [
      { type: '锁叉A', spec: 'S1', quantity: 2, unit: '个', supplier: '锁叉供应商' },
      { type: '锁叉B', spec: 'S2', quantity: 5, unit: '个', supplier: '锁叉供应商' }
    ]
  }, {
    category: 'lock',
    mode: 'compact'
  });

  assert.equal(doc.mode, 'compact');
  assert.equal(doc.pages.length, 1);
  const page = doc.pages[0];
  const totalRow = page.rows[page.rows.length - 1];
  assert.equal(totalRow.rowType, 'total');
  assert.equal(totalRow.values.quantity, 7);
});
