import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProcurementDocModel, PRINT_DOC_MAX_TABLE_WIDTH_PX } from '../src/features/procurement/printDocBuilder';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

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


test('buildProcurementDocModel preserves legacy category print schemas without template metadata', () => {
  const cases = [
    {
      category: '包装',
      expectedCategory: 'packaging',
      expectedColumns: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
      item: {
        supplier: '包装供应商',
        internal_name: '内名-旧包装',
        external_name: '外名-旧包装',
        name: '包装箱A',
        spec: 'P-旧',
        mb: '左',
        quantity_left: 2,
        quantity_right: 1,
        unit: '套',
        remark: '包装备注不进明细',
      },
      expectedValues: {
        productModelName: '包装箱A',
        spec: 'P-旧',
        mb: '左',
        qtyLeft: 2,
        qtyRight: 1,
        remark: '',
      },
      expectedTotal: { qtyLeft: 2, qtyRight: 1 },
    },
    {
      category: '锁芯',
      expectedCategory: 'cylinder',
      expectedColumns: ['no', 'type', 'eccentricity', 'quantity', 'unit', 'remark'],
      item: { supplier: '锁芯供应商', type: '锁芯A', eccentricity: '35*60', quantity: 4, remark: '锁芯备注' },
      expectedValues: { type: '锁芯A', eccentricity: '35*60', quantity: 4, unit: '套', remark: '锁芯备注' },
      expectedTotal: { quantity: 4 },
    },
    {
      category: '锁具',
      expectedCategory: 'lockset',
      expectedColumns: ['no', 'type', 'spec', 'qtyLeft', 'qtyRight', 'unit', 'remark'],
      item: { supplier: '锁具供应商', type: '锁具A', spec: 'L-旧', quantity_left: 5, quantity_right: 6, remark: '锁具备注' },
      expectedValues: { type: '锁具A', spec: 'L-旧', qtyLeft: 5, qtyRight: 6, unit: '套', remark: '锁具备注' },
      expectedTotal: { qtyLeft: 5, qtyRight: 6 },
    },
    {
      category: '拉手',
      expectedCategory: 'handle',
      expectedColumns: ['no', 'type', 'spec', 'qtyLeft', 'qtyRight', 'unit', 'remark'],
      item: { supplier: '拉手供应商', type: '拉手A', spec: 'H-旧', quantity_left: 7, quantity_right: 8, remark: '拉手备注' },
      expectedValues: { type: '拉手A', spec: 'H-旧', qtyLeft: 7, qtyRight: 8, unit: '付', remark: '拉手备注' },
      expectedTotal: { qtyLeft: 7, qtyRight: 8 },
    },
    {
      category: '锁叉',
      expectedCategory: 'lock',
      expectedColumns: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
      item: { supplier: '锁叉供应商', type: '单头锁叉 - 上头', spec: '570*301 = 871', quantity: 9, remark: '7CM 2100' },
      expectedValues: { type: '单头锁叉 - 上头', spec: '570*301 = 871', quantity: 9, unit: '个', remark: '7CM 2100' },
      expectedTotal: { quantity: 9 },
    },
    {
      category: '五金/配件',
      expectedCategory: 'hardware',
      expectedColumns: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
      item: { supplier: '五金供应商', type: '配件A', spec: 'G-旧', quantity: 10, unit: '个', remark: '五金备注' },
      expectedValues: { type: '配件A', spec: 'G-旧', quantity: 10, unit: '个', remark: '五金备注' },
      expectedTotal: { quantity: 10 },
    },
    {
      category: '历史未知类别',
      expectedCategory: 'packaging',
      expectedColumns: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
      item: { supplier: '未知供应商', name: '未知包装', model: 'U-旧', qty: '11/12', mb: '右', remark: '未知备注' },
      expectedValues: { productModelName: '未知包装', spec: 'U-旧', mb: '右', qtyLeft: 11, qtyRight: 12, remark: '' },
      expectedTotal: { qtyLeft: 11, qtyRight: 12 },
    },
  ];

  for (const testCase of cases) {
    const doc = buildProcurementDocModel({
      order: {
        order_no: `PO-LEGACY-${testCase.expectedCategory}`,
        category: testCase.category,
        supplier: testCase.item.supplier,
        metadata: { customer_name: '历史客户' },
        items: [testCase.item],
      },
    });

    assert.equal(doc.category, testCase.expectedCategory, testCase.category);
    assert.equal(doc.pages[0].category, testCase.expectedCategory, testCase.category);
    assert.deepEqual(doc.pages[0].columns.map((column) => column.key), testCase.expectedColumns, testCase.category);
    assert.deepEqual(doc.pages[0].rows[0].values, { no: 1, ...testCase.expectedValues }, testCase.category);
    assert.deepEqual(doc.pages[0].rows[doc.pages[0].rows.length - 1].values, {
      __label: '合计',
      __labelColspan: testCase.expectedColumns.includes('qtyLeft')
        ? (testCase.expectedCategory === 'packaging' ? 4 : 3)
        : testCase.expectedColumns.indexOf('quantity'),
      ...testCase.expectedTotal,
    }, testCase.category);
  }
});

test('buildProcurementDocModel covers the historical print smoke matrix from fixture-derived legacy samples', () => {
  const fixture = readJson('tests/fixtures/mapping-runtime-baseline.derived-cases.json');

  const matrix = [
    {
      id: 'packaging-derived',
      category: '包装',
      expectedCategory: 'packaging',
      expectedColumns: ['no', 'productModelName', 'spec', 'mb', 'qtyLeft', 'qtyRight', 'remark'],
      sample: fixture.cases[0].sample.list[0],
    },
    {
      id: 'cylinder-derived',
      category: '锁芯',
      expectedCategory: 'cylinder',
      expectedColumns: ['no', 'type', 'eccentricity', 'quantity', 'unit', 'remark'],
      sample: fixture.cases[0].expected.extracted.cylinders[0],
    },
    {
      id: 'lock-fork-legacy',
      category: '锁叉',
      expectedCategory: 'lock',
      expectedColumns: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
      sample: {
        supplier: '锁叉供应商',
        type: '单头锁叉 - 上头',
        spec: '570*301 = 871',
        quantity: 9,
        remark: '7CM 2100',
      },
    },
    {
      id: 'hardware-legacy',
      category: '五金/配件',
      expectedCategory: 'hardware',
      expectedColumns: ['no', 'type', 'spec', 'quantity', 'unit', 'remark'],
      sample: {
        supplier: '五金供应商',
        type: '配件A',
        spec: 'G-旧',
        quantity: 10,
        unit: '个',
        remark: '五金备注',
      },
    },
  ] as const;

  matrix.forEach((testCase) => {
    const doc = buildProcurementDocModel({
      category: testCase.category,
      poNumber: `PO-HISTORICAL-${testCase.id}`,
      order: {
        category: testCase.category,
        supplier: testCase.sample.supplier,
        metadata: { customer_name: '历史客户' },
        items: [testCase.sample],
      },
    });

    assert.equal(doc.category, testCase.expectedCategory, testCase.id);
    assert.equal(doc.pages[0].category, testCase.expectedCategory, testCase.id);
    assert.deepEqual(doc.pages[0].columns.map((column) => column.key), testCase.expectedColumns, testCase.id);
    assert.equal(doc.pages.length, 1, testCase.id);
    assert.equal(doc.pages[0].rows.at(-1)?.values.__label, '合计', testCase.id);
  });
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
