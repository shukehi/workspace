import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProcurementDocModel, PRINT_DOC_MAX_TABLE_WIDTH_PX } from '../src/features/procurement/printDocBuilder';

test('buildProcurementDocModel groups packaging items by internal name and appends total row', () => {
  const doc = buildProcurementDocModel({
    category: '包装',
    printMode: 'compact',
    poNumber: 'PO-BUILDER-001',
    order: {
      metadata: {
        customer_name: '客户A',
        printColumnWidths: {
          no: 48,
          productModelName: 220,
          spec: 160,
          mb: 74,
          qtyLeft: 80,
          qtyRight: 80,
          remark: 174,
        },
      },
      list: [
        {
          supplier: '供应商A',
          internal_name: '内名-1',
          external_name: '外名-1',
          name: '型号A',
          spec: 'S-1',
          mb: '左',
          quantity_left: 2,
          quantity_right: 3,
          remark: '备注A',
        },
        {
          supplier: '供应商A',
          internal_name: '内名-2',
          external_name: '外名-2',
          name: '型号B',
          spec: 'S-2',
          mb: '右',
          quantity_left: 4,
          quantity_right: 1,
          remark: '备注B',
        },
      ],
    },
  });

  assert.equal(doc.mode, 'compact');
  assert.equal(doc.pages.length, 2);
  assert.equal(doc.pages[0].columns.find((column) => column.key === 'spec')?.label, '规格');

  const firstPageTotalWidth = doc.pages[0].columns.reduce((sum, column) => sum + (column.width || 0), 0);
  assert.ok(firstPageTotalWidth <= PRINT_DOC_MAX_TABLE_WIDTH_PX);
  const productNameWidth = doc.pages[0].columns.find((column) => column.key === 'productModelName')?.width || 0;
  const specWidth = doc.pages[0].columns.find((column) => column.key === 'spec')?.width || 0;
  assert.ok(productNameWidth > specWidth);

  const totalRow = doc.pages[0].rows[doc.pages[0].rows.length - 1];
  assert.equal(totalRow.rowType, 'total');
  assert.equal(totalRow.values.__label, '合计');
  assert.equal(totalRow.values.qtyLeft, 2);
  assert.equal(totalRow.values.qtyRight, 3);

  const itemRow = doc.pages[0].rows[0];
  assert.equal(itemRow.values.remark, '');
});

test('buildProcurementDocModel can normalize full order payload', () => {
  const doc = buildProcurementDocModel({
    order: {
      order_no: 'PO-BUILDER-002',
      category: '锁芯',
      supplier: '锁芯供方',
      created_at: '2026-03-05T10:00:00.000Z',
      delivery_date: '2026-03-10T10:00:00.000Z',
      metadata: { customer_name: '客户B' },
      items: [
        { type: '锁芯A', eccentricity: '34.5*55.5', quantity: 8, unit: '套', remark: '测试' },
      ],
    },
  });

  assert.equal(doc.category, 'cylinder');
  assert.equal(doc.poNumber, 'PO-BUILDER-002');
  assert.equal(doc.pages.length, 1);
  assert.equal(doc.pages[0].rows[0].values.type, '锁芯A');
  assert.equal(doc.pages[0].rows[doc.pages[0].rows.length - 1].values.quantity, 8);
});

test('buildProcurementDocModel clamps oversized custom widths for print page', () => {
  const doc = buildProcurementDocModel({
    category: '锁芯',
    poNumber: 'PO-BUILDER-003',
    order: {
      metadata: {
        printColumnWidths: {
          no: 180,
          type: 320,
          eccentricity: 300,
          quantity: 260,
          unit: 220,
          remark: 360,
        },
      },
      list: [
        { type: '锁芯B', eccentricity: '40*60', quantity: 3, unit: '套', remark: '测试' },
      ],
    },
  });

  const widths = doc.pages[0].columns.map((column) => column.width || 0);
  const total = widths.reduce((sum, value) => sum + value, 0);
  assert.ok(total <= PRINT_DOC_MAX_TABLE_WIDTH_PX);
  assert.ok(widths.every((value) => value >= 36));
});
