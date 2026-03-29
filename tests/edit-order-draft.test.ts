import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapOrderDraft,
  buildManualOrderNo,
  createEmptyItem,
  createEmptyOrderDraft,
  createEmptyOrderDraftByTemplate,
} from '../src/features/procurement/editOrderDraft';
import { stripBlankManualItems, validateManualOrderDraft } from '../src/features/procurement/manualOrderValidation';
import type { Order } from '../src/types/order';

test('createEmptyItem creates category-specific packaging fields', () => {
  const packagingItem = createEmptyItem('packaging');
  assert.match(String(packagingItem.item_key), /^draft-item-/);
  assert.equal(packagingItem.unit, '套');
  assert.equal(packagingItem.internal_name, '');
  assert.equal(packagingItem.quantity_left, 0);

  const handleItem = createEmptyItem('handle');
  assert.equal(handleItem.unit, '付');
  assert.equal(handleItem.type, '');
});

test('createEmptyOrderDraft seeds packaging order defaults', () => {
  const draft = createEmptyOrderDraft('包装');
  assert.equal(draft.category, '包装');
  assert.equal(draft.status, 'draft');
  assert.equal(Array.isArray(draft.items), true);
  assert.equal(draft.items.length, 1);
  assert.match(draft.order_no, /^PM-\d{6}-\d{4}$/);
  assert.equal(draft.metadata?.template_type, 'packaging');
  assert.ok(draft.metadata?.printColumnWidths);
  assert.equal(draft.metadata?.aggregateSideQuantities, false);
});

test('createEmptyOrderDraftByTemplate maps merged templates to business categories', () => {
  const doubleDoorDraft = createEmptyOrderDraftByTemplate('double-door-accessory');
  assert.equal(doubleDoorDraft.category, '锁具');
  assert.equal(doubleDoorDraft.metadata?.template_type, 'double-door-accessory');
  assert.equal(doubleDoorDraft.items[0]?.unit, '套');

  const generalAccessoryDraft = createEmptyOrderDraftByTemplate('general-accessory');
  assert.equal(generalAccessoryDraft.category, '锁叉');
  assert.equal(generalAccessoryDraft.metadata?.template_type, 'general-accessory');
  assert.equal(generalAccessoryDraft.items[0]?.unit, '个');
});

test('buildManualOrderNo uses date token with four-digit sequence', () => {
  const orderNo = buildManualOrderNo(new Date('2026-03-29T08:35:00.000Z'), 1007);
  assert.equal(orderNo, 'PM-260329-1007');
});

test('bootstrapOrderDraft preserves edit payload and resolved widths', () => {
  const order: Order = {
    id: 88,
    order_no: 'PO-88',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    total_amount: 200,
    created_at: '2026-03-09T10:00:00.000Z',
    delivery_date: '2026-03-12T10:00:00.000Z',
    remark: '',
    items: [
      {
        id: 1,
        material_id: 'm1',
        internal_name: '3层黄卡美+C单瓦纸箱',
        external_name: '美+C单瓦',
        name: '纸箱',
        model: '1050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      }
    ],
    metadata: {
      customer_name: '客户A',
      internal_name: '3层黄卡美+C单瓦纸箱',
      external_name: '美+C单瓦',
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
  };

  const { draft, widths } = bootstrapOrderDraft({ mode: 'edit', order });
  assert.equal(draft.order_no, 'PO-88');
  assert.equal(draft.metadata?.template_type, 'packaging');
  assert.equal(draft.metadata?.printColumnWidths?.productModelName, widths.productModelName);
  assert.equal(typeof widths.remark, 'number');
});

test('bootstrapOrderDraft infers template_type for legacy categories', () => {
  const order: Order = {
    id: 99,
    order_no: 'PO-99',
    supplier: '测试供应商',
    category: '拉手',
    status: 'draft',
    total_amount: 0,
    created_at: '2026-03-09T10:00:00.000Z',
    delivery_date: '2026-03-12T10:00:00.000Z',
    remark: '',
    items: [],
    metadata: {
      customer_name: '客户B',
      printColumnWidths: {},
    },
  };

  const { draft } = bootstrapOrderDraft({ mode: 'edit', order });
  assert.equal(draft.metadata?.template_type, 'double-door-accessory');
});

test('bootstrapOrderDraft prefers category over persisted mismatched template_type', () => {
  const order: Order = {
    id: 100,
    order_no: 'PO-100',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    total_amount: 0,
    created_at: '2026-03-09T10:00:00.000Z',
    delivery_date: '2026-03-12T10:00:00.000Z',
    remark: '',
    items: [],
    metadata: {
      customer_name: '客户C',
      template_type: 'general-accessory',
      printColumnWidths: {},
    },
  };

  const { draft } = bootstrapOrderDraft({ mode: 'edit', order });
  assert.equal(draft.metadata?.template_type, 'packaging');
});

test('validateManualOrderDraft rejects blank manual placeholder rows', () => {
  const draft = createEmptyOrderDraft('包装');
  const issues = validateManualOrderDraft(draft);

  assert.deepEqual(issues, ['客户名称不能为空', '第 1 行缺少产品名称', '第 1 行数量（左/右）必须大于 0']);
  assert.equal(Array.isArray(stripBlankManualItems(draft.items, draft.category)), true);
});

test('validateManualOrderDraft requires business category for merged templates', () => {
  const draft = createEmptyOrderDraftByTemplate('double-door-accessory');
  draft.category = '';
  draft.supplier = '测试供应商';
  draft.metadata = {
    ...draft.metadata,
    customer_name: '客户A',
    template_type: 'double-door-accessory',
  };
  draft.items[0].type = '锁具A';
  draft.items[0].spec = 'S-1';
  draft.items[0].quantity_left = 1;
  draft.items[0].quantity_right = 1;
  draft.items[0].quantity = 2;

  assert.deepEqual(validateManualOrderDraft(draft), ['请选择业务类别']);
});

test('validateManualOrderDraft accepts populated manual rows', () => {
  const draft = createEmptyOrderDraft('包装');
  draft.metadata = {
    ...draft.metadata,
    customer_name: '客户A',
  };
  draft.items[0].name = '纸箱';
  draft.items[0].spec = '960*2050';
  draft.items[0].quantity_left = 1;
  draft.items[0].quantity_right = 1;
  draft.items[0].quantity = 2;

  assert.deepEqual(validateManualOrderDraft(draft), []);
});
