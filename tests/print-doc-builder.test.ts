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
        remark: '整单备注-A',
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
  assert.equal(doc.pages[0].orderRemark, '整单备注-A');

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
      remark: '整单备注-B',
      items: [
        { type: '锁芯A', eccentricity: '34.5*55.5', quantity: 8, unit: '套', remark: '测试' },
      ],
    },
  });

  assert.equal(doc.category, 'cylinder');
  assert.equal(doc.poNumber, 'PO-BUILDER-002');
  assert.equal(doc.pages.length, 1);
  assert.equal(doc.pages[0].orderRemark, '整单备注-B');
  assert.equal(doc.pages[0].rows[0].values.type, '锁芯A');
  assert.equal(doc.pages[0].rows[doc.pages[0].rows.length - 1].values.quantity, 8);
});

test('buildProcurementDocModel prints sales department keyword from customer name', () => {
  const doc = buildProcurementDocModel({
    order: {
      category: '包装',
      metadata: { customer_name: '外贸苏丹巴布(三部)' },
      items: [
        { supplier: '供应商A', type: '包装A', quantity_left: 1, quantity_right: 1 }
      ],
    },
  });

  assert.equal(doc.pages[0].customerName, '三部');
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

test('buildProcurementDocModel uses aggregate quantity column when order metadata enables it', () => {
  const doc = buildProcurementDocModel({
    category: '锁具',
    poNumber: 'PO-BUILDER-004',
    order: {
      metadata: {
        aggregateSideQuantities: true,
        printColumnWidths: {
          no: 48,
          type: 220,
          spec: 180,
          qtyLeft: 96,
          qtyRight: 104,
          unit: 70,
          remark: 160,
        },
      },
      items: [
        { type: '锁具A', spec: '主锁', quantity_left: 2, quantity_right: 3, unit: '套', remark: '备注A' },
      ],
    },
  });

  assert.deepEqual(doc.pages[0].columns.map((column) => column.key), ['no', 'type', 'spec', 'quantity', 'unit', 'remark']);
  assert.equal(doc.pages[0].columns.find((column) => column.key === 'quantity')?.label, '总数量');
  assert.equal(doc.pages[0].rows[0].values.quantity, 5);
  assert.equal(doc.pages[0].rows[doc.pages[0].rows.length - 1].values.quantity, 5);
  assert.ok((doc.pages[0].columns.find((column) => column.key === 'remark')?.width || 0) > 160);
});

test('buildProcurementDocModel prefers template schema over legacy category for unified accessory templates', () => {
  const doc = buildProcurementDocModel({
    order: {
      order_no: 'PO-BUILDER-005',
      category: '五金/配件',
      supplier: '五金供应商',
      metadata: {
        customer_name: '客户D',
        template_type: 'general-accessory',
      },
      items: [
        { type: '锁叉A', spec: 'A-1', quantity: 3, unit: '个', remark: '测试' },
      ],
    },
  });

  assert.equal(doc.category, 'hardware');
  assert.equal(doc.pages[0].category, 'hardware');
  assert.deepEqual(doc.pages[0].columns.map((column) => column.key), ['no', 'type', 'spec', 'quantity', 'unit', 'remark']);
  assert.equal(doc.pages[0].rows[0].values.unit, '个');
});

test('buildProcurementDocModel keeps handle default unit while using shared double-door schema', () => {
  const doc = buildProcurementDocModel({
    order: {
      order_no: 'PO-BUILDER-006',
      category: '拉手',
      supplier: '拉手供应商',
      metadata: {
        customer_name: '客户E',
        template_type: 'double-door-accessory',
      },
      items: [
        { type: '拉手A', spec: 'H-1', quantity_left: 1, quantity_right: 2, remark: '测试' },
      ],
    },
  });

  assert.equal(doc.category, 'handle');
  assert.equal(doc.pages[0].category, 'handle');
  assert.deepEqual(doc.pages[0].columns.map((column) => column.key), ['no', 'type', 'spec', 'qtyLeft', 'qtyRight', 'unit', 'remark']);
  assert.equal(doc.pages[0].rows[0].values.unit, '付');
});

test('buildProcurementDocModel falls back to schema category when business category is missing', () => {
  const doc = buildProcurementDocModel({
    order: {
      order_no: 'PO-BUILDER-007',
      supplier: '未分类供应商',
      metadata: {
        customer_name: '客户F',
        template_type: 'general-accessory',
      },
      items: [
        { type: '配件A', spec: 'G-1', quantity: 2, remark: '测试' },
      ],
    },
  });

  assert.equal(doc.category, 'lock');
  assert.equal(doc.pages[0].category, 'lock');
  assert.deepEqual(doc.pages[0].columns.map((column) => column.key), ['no', 'type', 'spec', 'quantity', 'unit', 'remark']);
});
