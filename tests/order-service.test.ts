import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const TEST_DB = path.join('/tmp', 'order-search-order-service.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Order, OrderItem, OrderIdempotencyKey, Material, InventoryReceipt } = require('../server/models') as typeof import('../server/models');
const orderService = (require('../server/services/orders') as typeof import('../server/services/orders')).default;
const orderRepository = require('../server/services/orders/order.repository') as typeof import('../server/services/orders/order.repository');
import type { MaterialInstance, InventoryReceiptInstance, OrderInstance } from '../server/models';
import type { OrderCreateInput, OrderUpdateInput } from '../server/models/types';

const createdOrderIds: number[] = [];

function uniqueOrderNo(prefix = 'TEST-PO') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test('OrderService CRUD and category filter', async (t) => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const orderNo = uniqueOrderNo();

  const created = await orderService.createOrder({
    order_no: orderNo,
    supplier: 'Test Supplier',
    category: '包装',
    status: 'draft',
    remark: '整单备注-创建',
    metadata: { source: 'test' },
    created_at: new Date().toISOString(),
    items: [
      {
        supplier: '方亮包装',
        internal_name: '3层黄卡美+C单瓦纸箱',
        external_name: '美+C单瓦',
        type: '90AB微珠锌合金锁芯 ORIGINAL&SED(TURKEY)',
        spec: '960*2050/7/内开外包',
        mb: '新元宝边',
        eccentricity: '34.5*55.5/中心孔偏心',
        name: 'Test Item',
        model: 'MODEL-X',
        quantity: 3,
        quantity_left: 1,
        quantity_right: 2,
        unit: 'pcs',
        price: 10,
        remark: 'created by test'
      }
    ]
  });

  createdOrderIds.push(created.id);

  assert.equal(typeof created.id, 'number');
  assert.equal(created.category, '包装');
  assert.equal(created.items.length, 1);
  assert.equal(created.items[0].name, 'Test Item');
  assert.equal(created.items[0].supplier, '方亮包装');
  assert.equal(created.items[0].internal_name, '3层黄卡美+C单瓦纸箱');
  assert.equal(created.items[0].external_name, '美+C单瓦');
  assert.equal(created.items[0].eccentricity, '34.5*55.5/中心孔偏心');
  assert.equal(created.items[0].quantity_left, 1);
  assert.equal(created.items[0].quantity_right, 2);
  assert.equal(created.items[0].ordered_quantity, 3);
  assert.equal(created.items[0].received_quantity, 0);
  assert.equal(created.remark, '整单备注-创建');
  assert.equal(created.items[0].remark, 'created by test');

  const fetched = await orderService.getOrderById(created.id);
  assert.ok(fetched);
  assert.equal(fetched.order_no, orderNo);

  const filtered = await orderService.getAllOrders('包装');
  assert.ok(filtered.some((o: { id: number }) => o.id === created.id));

  const nextCreatedAt = '2026-02-01T00:00:00.000Z';
  const updated = await orderService.updateOrder(created.id, {
    category: '锁芯',
    status: 'submitted',
    created_at: nextCreatedAt,
    remark: '整单备注-更新'
  });

  assert.equal(updated.category, '锁芯');
  assert.equal(updated.status, 'submitted');
  assert.equal(new Date(updated.created_at).toISOString(), nextCreatedAt);
  assert.equal(updated.remark, '整单备注-更新');
  assert.equal(updated.items[0].remark, 'created by test');

  const filteredAfterUpdate = await orderService.getAllOrders('锁芯');
  assert.ok(filteredAfterUpdate.some((o: { id: number }) => o.id === created.id));

  const paginated = await orderService.getPaginatedOrders({
    status: 'submitted',
    category: 'cylinder',
    page: 1,
    pageSize: 20,
  });
  assert.equal(paginated.total, 1);
  assert.equal(paginated.rows.length, 1);
  assert.equal(paginated.rows[0].id, created.id);
  assert.equal((paginated.facets as any).statusCounts.submitted, 1);
  assert.equal((paginated.facets as any).categoryCounts.cylinder, 1);

  await orderService.deleteOrder(created.id);

  const afterDelete = await orderService.getOrderById(created.id);
  assert.equal(afterDelete, null);
});

test('OrderService paginated query keeps DB-level filters and full-result aggregates aligned', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await orderService.createOrder({
    order_no: uniqueOrderNo('PAGE-FILTER'),
    supplier: '汇成',
    category: '锁具',
    status: 'processing',
    created_at: '2026-03-12T09:00:00.000Z',
    items: [
      {
        supplier: '汇成',
        type: '锁体A',
        name: '锁体A',
        model: '主锁-A',
        quantity: 2,
        price: 10,
        unit: '把',
        remark: '待确认：门厚异常',
      }
    ]
  });

  await orderService.createOrder({
    order_no: uniqueOrderNo('PAGE-FILTER'),
    supplier: '汇成',
    category: 'lockset',
    status: 'submitted',
    created_at: '2026-03-12T09:01:00.000Z',
    items: [
      {
        supplier: '待人工处理',
        type: '未匹配锁体',
        name: '未匹配锁体',
        model: '主锁-B',
        quantity: 3,
        price: 20,
        unit: '把',
      }
    ]
  });

  await orderService.createOrder({
    order_no: uniqueOrderNo('PAGE-FILTER'),
    supplier: '方亮包装',
    category: '包装',
    status: 'processing',
    created_at: '2026-03-12T09:02:00.000Z',
    items: [
      {
        supplier: '方亮包装',
        name: '纸箱A',
        model: 'BZ-1',
        quantity: 1,
        price: 5,
        unit: '套',
      }
    ]
  });

  await orderService.createOrder({
    order_no: uniqueOrderNo('PAGE-FILTER'),
    supplier: '人工复核厂',
    category: 'lockset',
    status: 'processing',
    created_at: '2026-03-12T09:03:00.000Z',
    metadata: { riskWarningDismissed: true },
    items: [
      {
        supplier: '待人工处理',
        type: '未匹配锁体',
        name: '未匹配锁体',
        model: '主锁-C',
        quantity: 4,
        price: 30,
        unit: '把',
      }
    ]
  });

  const firstPage = await orderService.getPaginatedOrders({
    category: 'lockset',
    risk: 'RISK',
    keyword: '主锁',
    page: 1,
    pageSize: 10,
  });

  assert.equal(firstPage.total, 2);
  assert.equal(firstPage.rows.length, 2);
  assert.equal(firstPage.rows[0].category, 'lockset');
  assert.equal(firstPage.rows[0].status, 'submitted');
  assert.equal(firstPage.summary.totalAmount, 80);
  assert.equal(firstPage.summary.pendingCount, 2);
  assert.equal(firstPage.facets.statusCounts.submitted, 1);
  assert.equal(firstPage.facets.statusCounts.processing, 1);
  assert.equal(firstPage.facets.categoryCounts.lockset, 2);
  assert.equal(firstPage.facets.riskCounts.RISK, 2);
  assert.equal(firstPage.facets.riskCounts.MANUAL, 1);
});

test('OrderService createOrder falls back to plain payload when immediate refetch returns null', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const originalGetOrderById = orderService.getOrderById;
  orderService.getOrderById = async () => null;

  try {
    const created = await orderService.createOrder({
      order_no: uniqueOrderNo('FALLBACK-PO'),
      supplier: 'Fallback Supplier',
      category: '包装',
      status: 'draft',
      remark: 'fallback create',
      metadata: { source: 'fallback-test' },
      created_at: '2026-03-06T08:20:00.000Z',
      items: [
        {
          name: 'Fallback Item',
          model: 'MODEL-F',
          spec: '960*2050/7/内开外包',
          supplier: 'Fallback Supplier',
          quantity: 1,
          unit: '套',
        }
      ]
    });

    assert.equal(created.order_no.startsWith('FALLBACK-PO'), true);
    assert.equal(created.created_at, '2026-03-06T08:20:00.000Z');
    assert.equal(Array.isArray(created.items), true);
    assert.equal(created.items.length, 1);
    assert.equal(created.total_amount, 0);
  } finally {
    orderService.getOrderById = originalGetOrderById;
  }
});

test('OrderService ignores client supplied ordered and received quantities on create', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('QTY-GUARD'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    items: [
      {
        name: '包装A',
        model: 'M-1',
        quantity: 5,
        ordered_quantity: 99,
        received_quantity: 88,
        unit: '套',
      }
    ]
  });

  assert.equal(created.items[0].quantity, 5);
  assert.equal(created.items[0].ordered_quantity, 5);
  assert.equal(created.items[0].received_quantity, 0);
});

test('OrderService prevents duplicate auto-generated orders and allows regeneration after cancellation', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const payload = {
    order_no: uniqueOrderNo('AUTO-PO'),
    supplier: '汇成',
    source_contract_code: 'CT-AUTO-001',
    category: '锁具',
    status: 'draft',
    remark: '',
    metadata: {
      order_source: 'auto',
      source_contract_code: 'CT-AUTO-001',
      customer_name: '客户A',
    },
    created_at: '2026-03-11T09:00:00.000Z',
    items: [
      {
        supplier: '汇成',
        type: '智能锁体A',
        name: '智能锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 8,
        quantity_left: 3,
        quantity_right: 5,
        unit: '把',
        remark: '单活'
      }
    ]
  };

  const created = await orderService.createOrder(payload as OrderCreateInput);
  assert.equal(created.source_contract_code, 'CT-AUTO-001');
  assert.equal(typeof created.dedupe_key, 'string');
  assert.equal(created.dedupe_key.length > 0, true);
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 1);

  await assert.rejects(
    () => orderService.createOrder({ ...payload, order_no: uniqueOrderNo('AUTO-PO') } as OrderCreateInput),
    (error: { code: string; existingOrder: { order_no: string; status: string } }) => {
      assert.equal(error.code, 'DUPLICATE_ORDER');
      assert.equal(error.existingOrder.order_no, created.order_no);
      assert.equal(error.existingOrder.status, 'draft');
      return true;
    }
  );

  const cancelled = await orderService.updateOrder(created.id, { status: 'cancelled' });
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 0);

  const regenerated = await orderService.createOrder({ ...payload, order_no: uniqueOrderNo('AUTO-PO') } as OrderCreateInput);
  assert.equal(regenerated.id !== created.id, true);
  assert.equal(regenerated.source_contract_code, 'CT-AUTO-001');
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: regenerated.id, active: true } }), 1);
});

test('OrderService can restore a cancelled auto order only when idempotency key is available', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const payload = {
    order_no: uniqueOrderNo('AUTO-RESTORE'),
    supplier: '应志友',
    source_contract_code: 'CT-AUTO-RESTORE-001',
    category: '锁叉',
    status: 'draft',
    metadata: {
      order_source: 'auto',
      source_contract_code: 'CT-AUTO-RESTORE-001',
    },
    created_at: '2026-03-11T12:00:00.000Z',
    items: [
      {
        supplier: '应志友',
        name: '锁叉A',
        type: '锁叉A',
        model: '570*301 = 871',
        spec: '570*301 = 871',
        quantity: 6,
        unit: '个',
      }
    ]
  };

  const created = await orderService.createOrder(payload as OrderCreateInput);
  await orderService.updateOrder(created.id, { status: 'cancelled' });
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 0);

  const restored = await orderService.updateOrder(created.id, { status: 'draft' });
  assert.equal(restored.status, 'draft');
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 1);

  await orderService.updateOrder(created.id, { status: 'cancelled' });
  const other = await orderService.createOrder({
    ...payload,
    order_no: uniqueOrderNo('AUTO-RESTORE'),
  } as OrderCreateInput);
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: other.id, active: true } }), 1);

  await assert.rejects(
    () => orderService.updateOrder(created.id, { status: 'draft' }),
    (error: { code: string }) => {
      assert.equal(error.code, 'DUPLICATE_ORDER');
      return true;
    }
  );
});

test('OrderService supports processing to arrived transition and restores cancelled auto orders to arrived', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('AUTO-ARRIVED'),
    supplier: '汇成',
    source_contract_code: 'CT-AUTO-ARRIVED-001',
    category: '锁具',
    status: 'processing',
    delivery_date: '2026-03-15T00:00:00.000Z',
    metadata: {
      order_source: 'auto',
      source_contract_code: 'CT-AUTO-ARRIVED-001',
    },
    created_at: '2026-03-12T09:00:00.000Z',
    items: [
      {
        supplier: '汇成',
        type: '锁体A',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 1,
        unit: '把',
      }
    ]
  });

  const arrived = await orderService.markArrived(created.id, {
    arrived_at: '2026-03-12T10:00:00.000Z',
    arrived_by: '采购员A',
    arrived_remark: '整单到货'
  });
  assert.equal(arrived.status, 'arrived');
  assert.equal(arrived.arrived_by, '采购员A');
  assert.equal(arrived.arrived_remark, '整单到货');
  assert.equal(arrived.arrived_at, '2026-03-12T10:00:00.000Z');
  assert.equal(arrived.delivery_date, '2026-03-15T00:00:00.000Z');

  await orderService.updateOrder(created.id, { status: 'cancelled' });
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 0);

  const restored = await orderService.updateOrder(created.id, { status: 'arrived' });
  assert.equal(restored.status, 'arrived');
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 1);
});

test('OrderService rejects invalid status transitions', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('INVALID-TRANSITION'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    created_at: '2026-03-12T08:00:00.000Z',
    items: [
      {
        supplier: '测试供应商',
        name: '包装箱',
        model: 'PK-1',
        spec: '900*2050',
        quantity: 2,
        unit: '套',
      }
    ]
  });

  await assert.rejects(
    () => orderService.updateOrder(created.id, { status: 'completed' }),
    (error: { code: string; fromStatus: string; toStatus: string }) => {
      assert.equal(error.code, 'INVALID_STATUS_TRANSITION');
      assert.equal(error.fromStatus, 'draft');
      assert.equal(error.toStatus, 'completed');
      return true;
    }
  );
});

test('OrderService stockInOrder creates receipts and increments inventory', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const material = await Material.create({
    code: 'MAT-STOCKIN-001',
    name: '锁体A',
    model: '主锁',
    supplier: '汇成',
    stock_quantity: 5,
    min_stock: 1,
    unit: '把',
  }) as MaterialInstance;

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN'),
    supplier: '汇成',
    source_contract_code: 'CT-STOCK-IN-001',
    category: '锁具',
    status: 'arrived',
    arrived_at: '2026-03-12T09:00:00.000Z',
    items: [
      {
        material_id: 'MAT-STOCKIN-001',
        supplier: '汇成',
        type: '锁体A',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 3,
        unit: '把',
      }
    ]
  });

  const stockedIn = await orderService.stockInOrder(created.id, {
    stocked_in_at: '2026-03-12T11:00:00.000Z',
    operator: '仓管A',
    remark: '验收入库'
  });

  assert.equal(stockedIn.status, 'completed');
  assert.equal(stockedIn.stocked_in_by, '仓管A');
  assert.equal(stockedIn.stocked_in_remark, '验收入库');
  assert.equal(stockedIn.stocked_in_at, '2026-03-12T11:00:00.000Z');
  assert.equal(stockedIn.items[0].ordered_quantity, 3);
  assert.equal(stockedIn.items[0].received_quantity, 3);

  const refreshedMaterial = await Material.findByPk(material.id) as MaterialInstance | null;
  assert.equal(Number(refreshedMaterial!.stock_quantity), 8);

  const receipts = await InventoryReceipt.findAll({ where: { order_id: created.id } }) as InventoryReceiptInstance[];
  assert.equal(receipts.length, 1);
  assert.equal(receipts[0].material_id, 'MAT-STOCKIN-001');
  assert.equal(Number(receipts[0].quantity), 3);
});

test('OrderService stockInOrder supports explicit partial receipt items', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Material.bulkCreate([
    {
      code: 'MAT-PARTIAL-001',
      name: '锁体A',
      model: '主锁',
      supplier: '汇成',
      stock_quantity: 5,
      min_stock: 0,
      unit: '把',
    },
    {
      code: 'MAT-PARTIAL-002',
      name: '锁体B',
      model: '副锁',
      supplier: '汇成',
      stock_quantity: 1,
      min_stock: 0,
      unit: '把',
    }
  ]);

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-PARTIAL'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-PARTIAL-001',
        supplier: '汇成',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 3,
        unit: '把',
      },
      {
        material_id: 'MAT-PARTIAL-002',
        supplier: '汇成',
        name: '锁体B',
        model: '副锁',
        spec: '副锁',
        quantity: 2,
        unit: '把',
      }
    ]
  });

  const firstReceipt = await orderService.stockInOrder(created.id, {
    stocked_in_at: '2026-03-12T12:00:00.000Z',
    operator: '仓管P1',
    items: [
      {
        order_item_id: created.items[0].id,
        item_key: created.items[0].item_key,
        quantity: 1
      }
    ]
  });

  assert.equal(firstReceipt.status, 'arrived');
  assert.equal(firstReceipt.items[0].received_quantity, 1);
  assert.equal(firstReceipt.items[1].received_quantity, 0);
  assert.equal(firstReceipt.stocked_in_at, null);
  assert.equal(firstReceipt.stocked_in_by ?? null, null);
  assert.equal(await InventoryReceipt.count({ where: { order_id: created.id } }), 1);

  const finalReceipt = await orderService.stockInOrder(created.id, {
    stocked_in_at: '2026-03-12T13:00:00.000Z',
    operator: '仓管P2',
    items: [
      {
        order_item_id: firstReceipt.items[0].id,
        item_key: firstReceipt.items[0].item_key,
        quantity: 2
      },
      {
        order_item_id: firstReceipt.items[1].id,
        item_key: firstReceipt.items[1].item_key,
        quantity: 2
      }
    ]
  });

  assert.equal(finalReceipt.status, 'completed');
  assert.equal(finalReceipt.items[0].received_quantity, 3);
  assert.equal(finalReceipt.items[1].received_quantity, 2);
  assert.equal(await InventoryReceipt.count({ where: { order_id: created.id } }), 3);

  const materials = await Material.findAll({
    where: { code: ['MAT-PARTIAL-001', 'MAT-PARTIAL-002'] },
    order: [['code', 'ASC']]
  }) as MaterialInstance[];
  assert.equal(Number(materials[0].stock_quantity), 8);
  assert.equal(Number(materials[1].stock_quantity), 3);
});

test('OrderService stockInOrder falls back to quantity when ordered_quantity is zero on legacy items', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Material.create({
    code: 'MAT-LEGACY-ORDERED-001',
    name: '旧单锁芯',
    model: 'LEG-1',
    supplier: '忠恒',
    stock_quantity: 0,
    min_stock: 0,
    unit: '套',
  });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-LEGACY-ORDERED'),
    supplier: '忠恒',
    category: '锁芯',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-LEGACY-ORDERED-001',
        supplier: '忠恒',
        name: '旧单锁芯',
        model: 'LEG-1',
        spec: 'LEG-1',
        quantity: 24,
        unit: '套',
      }
    ]
  });

  await OrderItem.update(
    { ordered_quantity: 0, received_quantity: 0 },
    { where: { order_id: created.id } }
  );

  const stockedIn = await orderService.stockInOrder(created.id, {
    stocked_in_at: '2026-03-12T14:00:00.000Z',
    operator: '仓管Legacy',
  });

  assert.equal(stockedIn.status, 'completed');
  assert.equal(stockedIn.items[0].ordered_quantity, 24);
  assert.equal(stockedIn.items[0].received_quantity, 24);
});

test('OrderService stockInOrder accepts legacy item key format after material_id backfill', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Material.create({
    code: 'MAT-LEGACY-KEY-001',
    name: '旧 key 锁体',
    model: '主锁',
    supplier: '汇成',
    stock_quantity: 0,
    min_stock: 0,
    unit: '把',
  });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-LEGACY-KEY'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-LEGACY-KEY-001',
        supplier: '汇成',
        name: '旧 key 锁体',
        model: '主锁',
        spec: '主锁',
        quantity: 2,
        unit: '把',
      }
    ]
  });

  const legacyKey = `|${created.items[0].name}|${created.items[0].spec}`;
  const stocked = await orderService.stockInOrder(created.id, {
    stocked_in_at: '2026-03-12T13:30:00.000Z',
    operator: '仓管Legacy',
    items: [
      {
        order_item_id: created.items[0].id,
        item_key: legacyKey,
        quantity: 1
      }
    ]
  });

  assert.equal(stocked.items[0].received_quantity, 1);
});

test('OrderService stockInOrder rejects explicit empty receipt items', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Material.create({
    code: 'MAT-EMPTY-ITEMS-001',
    name: '锁体A',
    model: '主锁',
    supplier: '汇成',
    stock_quantity: 5,
    min_stock: 0,
    unit: '把',
  });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-EMPTY-ITEMS'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-EMPTY-ITEMS-001',
        supplier: '汇成',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 2,
        unit: '把',
      }
    ]
  });

  await assert.rejects(
    () => orderService.stockInOrder(created.id, {
      stocked_in_at: '2026-03-12T12:30:00.000Z',
      operator: '仓管E',
      items: []
    }),
    (error: { code: string }) => {
      assert.equal(error.code, 'ORDER_ITEMS_REQUIRED');
      return true;
    }
  );

  const refreshed = await orderService.getOrderById(created.id);
  assert.equal(refreshed.status, 'arrived');
  assert.equal(refreshed.stocked_in_at, null);
  assert.equal(await InventoryReceipt.count({ where: { order_id: created.id } }), 0);
});

test('OrderService stockInOrder rejects missing material mapping', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-MISSING'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MISSING-MATERIAL',
        supplier: '汇成',
        name: '锁体B',
        model: '副锁',
        spec: '副锁',
        quantity: 1,
        unit: '把',
      }
    ]
  });

  await assert.rejects(
    () => orderService.stockInOrder(created.id, {
      stocked_in_at: '2026-03-12T11:00:00.000Z',
      operator: '仓管B',
    }),
    (error: { code: string; materialId: string }) => {
      assert.equal(error.code, 'MATERIAL_NOT_FOUND');
      assert.equal(error.materialId, 'MISSING-MATERIAL');
      return true;
    }
  );
});

test('OrderService stockInOrder rejects orders without items', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-NO-ITEMS'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: []
  });

  await assert.rejects(
    () => orderService.stockInOrder(created.id, {
      stocked_in_at: '2026-03-12T11:00:00.000Z',
      operator: '仓管C',
    }),
    (error: { code: string }) => {
      assert.equal(error.code, 'ORDER_ITEMS_REQUIRED');
      return true;
    }
  );

  const refreshed = await orderService.getOrderById(created.id);
  assert.equal(refreshed.status, 'arrived');
  assert.equal(await InventoryReceipt.count({ where: { order_id: created.id } }), 0);
});

test('OrderService stockInOrder rejects received quantity overflow', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const material = await Material.create({
    code: 'MAT-OVERFLOW-001',
    name: '锁体A',
    model: '主锁',
    supplier: '汇成',
    stock_quantity: 1,
    min_stock: 0,
    unit: '把',
  }) as MaterialInstance;

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-OVERFLOW'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: material.code,
        supplier: '汇成',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 2,
        unit: '把',
      }
    ]
  });

  await OrderItem.update(
    { ordered_quantity: 2, received_quantity: 2 },
    { where: { order_id: created.id } }
  );

  await assert.rejects(
    () => orderService.stockInOrder(created.id, {
      stocked_in_at: '2026-03-12T11:00:00.000Z',
      operator: '仓管D',
      items: [
        {
          order_item_id: created.items[0].id,
          item_key: created.items[0].item_key,
          quantity: 2
        }
      ]
    }),
    (error: { code: string; orderedQuantity: number; nextReceivedQuantity: number }) => {
      assert.equal(error.code, 'RECEIVED_QUANTITY_EXCEEDED');
      assert.equal(error.orderedQuantity, 2);
      assert.equal(error.nextReceivedQuantity, 4);
      return true;
    }
  );
});

test('OrderService stockInOrder rejects explicit item key mismatch', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Material.create({
    code: 'MAT-KEY-MISMATCH-001',
    name: '锁体A',
    model: '主锁',
    supplier: '汇成',
    stock_quantity: 0,
    min_stock: 0,
    unit: '把',
  });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('STOCK-IN-MISMATCH'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-KEY-MISMATCH-001',
        supplier: '汇成',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 1,
        unit: '把',
      }
    ]
  });

  await assert.rejects(
    () => orderService.stockInOrder(created.id, {
      items: [
        {
          order_item_id: created.items[0].id,
          item_key: 'WRONG|KEY|VALUE',
          quantity: 1
        }
      ]
    }),
    (error: { code: string }) => {
      assert.equal(error.code, 'ORDER_ITEM_KEY_MISMATCH');
      return true;
    }
  );
});

test('OrderService rejects detail edits for arrived orders', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('ARRIVED-LOCK'),
    supplier: '汇成',
    category: '锁具',
    status: 'arrived',
    items: [
      {
        material_id: 'MAT-LOCK-001',
        supplier: '汇成',
        name: '锁体A',
        model: '主锁',
        spec: '主锁',
        quantity: 1,
        unit: '把',
      }
    ]
  });

  await assert.rejects(
    () => orderService.updateOrder(created.id, {
      supplier: '新供应商',
      items: [
        {
          ...created.items[0],
          quantity: 2
        }
      ]
    }),
    (error: { code: string; status: string; fields: string[] }) => {
      assert.equal(error.code, 'ORDER_EDIT_LOCKED');
      assert.equal(error.status, 'arrived');
      assert.deepEqual(error.fields, ['supplier', 'items']);
      return true;
    }
  );

  const updated = await orderService.updateOrder(created.id, {
    remark: '允许修改备注',
    delivery_date: '2026-03-20T00:00:00.000Z'
  });
  assert.equal(updated.remark, '允许修改备注');
  assert.equal(updated.delivery_date, '2026-03-20T00:00:00.000Z');
});

test('OrderService persists source_contract_code from metadata and ignores client-supplied dedupe_key on update', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('AUTO-META'),
    supplier: '忠恒',
    category: '锁芯',
    status: 'draft',
    dedupe_key: 'client-forged-key',
    metadata: {
      order_source: 'auto',
      source_contract_code: 'CT-AUTO-META-001',
      customer_name: '客户C',
    },
    created_at: '2026-03-11T11:00:00.000Z',
    items: [
      {
        supplier: '忠恒',
        type: '锁芯A',
        name: '锁芯A',
        model: '34.5*55.5',
        eccentricity: '34.5*55.5',
        quantity: 2,
        unit: '套',
      }
    ]
  } as any);

  assert.equal(created.source_contract_code, 'CT-AUTO-META-001');
  assert.notEqual(created.dedupe_key, 'client-forged-key');

  const originalDedupeKey = created.dedupe_key;
  const updated = await orderService.updateOrder(created.id, {
    dedupe_key: 'tampered-key',
    remark: '重新备注'
  } as OrderUpdateInput);

  assert.equal(updated.source_contract_code, 'CT-AUTO-META-001');
  assert.equal(updated.dedupe_key, originalDedupeKey);
  assert.equal(updated.remark, '重新备注');
});

test('OrderService backfills idempotency key for legacy auto orders on update', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await Order.create({
    order_no: uniqueOrderNo('LEGACY-AUTO'),
    supplier: '汇成',
    source_contract_code: 'CT-LEGACY-001',
    dedupe_key: 'legacy-key-1',
    category: '锁具',
    status: 'draft',
    remark: '',
    metadata: {
      order_source: 'auto',
      source_contract_code: 'CT-LEGACY-001',
    },
    created_at: '2026-03-11T13:00:00.000Z',
  }) as OrderInstance;
  await OrderItem.create({
    order_id: created.id,
    supplier: '汇成',
    name: '智能锁体A',
    type: '智能锁体A',
    model: '主锁',
    spec: '主锁',
    quantity: 2,
    unit: '把',
  });

  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id } }), 0);

  const updated = await orderService.updateOrder(created.id, { remark: '补建幂等键' });
  assert.equal(updated.remark, '补建幂等键');
  assert.equal(await OrderIdempotencyKey.count({ where: { order_id: created.id, active: true } }), 1);
});

test('OrderService does not dedupe manual orders without source contract code', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const payload = {
    order_no: uniqueOrderNo('MANUAL-PO'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    remark: '',
    delivery_date: '2026-03-12T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    created_at: '2026-03-11T10:00:00.000Z',
    items: [
      {
        supplier: '测试供应商',
        name: '包装箱',
        model: 'PK-1',
        spec: '900*2050',
        quantity: 2,
        unit: '套',
      }
    ]
  };

  const first = await orderService.createOrder(payload as OrderCreateInput);
  const second = await orderService.createOrder({ ...payload, order_no: uniqueOrderNo('MANUAL-PO') } as OrderCreateInput);

  assert.equal(first.id !== second.id, true);
  assert.equal(first.source_contract_code ?? null, null);
  assert.equal(second.source_contract_code ?? null, null);
});

test('OrderService rejects duplicate manual order numbers with domain error', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const first = await orderService.createOrder({
    order_no: 'MANUAL-DUP-001',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-12T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    created_at: '2026-03-11T10:00:00.000Z',
    items: [
      {
        supplier: '测试供应商',
        name: '包装箱',
        model: 'PK-1',
        spec: '900*2050',
        quantity: 2,
        unit: '套',
      }
    ]
  } as OrderCreateInput);

  await assert.rejects(
    () => orderService.createOrder({
      order_no: 'MANUAL-DUP-001',
      supplier: '测试供应商',
      category: '包装',
      status: 'draft',
      delivery_date: '2026-03-12T10:00:00.000Z',
      metadata: {
        order_source: 'manual',
        customer_name: '客户C',
      },
      created_at: '2026-03-11T11:00:00.000Z',
      items: [
        {
          supplier: '测试供应商',
          name: '包装箱',
          model: 'PK-2',
          spec: '920*2050',
          quantity: 1,
          unit: '套',
        }
      ]
    } as OrderCreateInput),
    (error: { code: string; existingOrder: { order_no: string; id: number } }) => {
      assert.equal(error.code, 'DUPLICATE_ORDER');
      assert.equal(error.existingOrder.order_no, first.order_no);
      assert.equal(error.existingOrder.id, first.id);
      return true;
    },
  );
});

test('OrderService reports duplicate order after placeholder retry exhaustion using last allocated number', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const originalAllocateNextManualOrderNo = orderService.allocateNextManualOrderNo.bind(orderService);
  const originalAssertUniqueOrderNo = orderService.assertUniqueOrderNo.bind(orderService);
  const originalOrderCreate = Order.create;

  const allocatedOrderNos = [
    'PM-260329-1001',
    'PM-260329-1002',
    'PM-260329-1003',
    'PM-260329-1004',
    'PM-260329-1005',
  ];
  let allocationIndex = 0;
  let uniquenessCheckCount = 0;
  const existingOrder = {
    id: 99,
    order_no: 'PM-260329-1005',
    status: 'draft',
    category: '包装',
    supplier: '测试供应商',
    source_contract_code: null,
  } as any;

  orderService.allocateNextManualOrderNo = async () => allocatedOrderNos[allocationIndex++] || allocatedOrderNos[allocatedOrderNos.length - 1];
  orderService.assertUniqueOrderNo = async (orderNo: unknown, excludeId?: number | string, transaction?: any) => {
    uniquenessCheckCount += 1;
    if (uniquenessCheckCount <= allocatedOrderNos.length) return;
    if (String(orderNo || '').trim() === existingOrder.order_no) {
      throw new orderService.DuplicateOrderError(existingOrder);
    }
    return await originalAssertUniqueOrderNo(orderNo, excludeId, transaction);
  };
  Order.create = (async () => {
    const error = new Error('UNIQUE constraint failed: orders.order_no') as Error & { name: string };
    error.name = 'SequelizeUniqueConstraintError';
    throw error;
  }) as typeof Order.create;

  try {
    await assert.rejects(
      () => orderService.createOrder({
        order_no: 'PM-260329-1001',
        supplier: '测试供应商',
        category: '包装',
        status: 'draft',
        delivery_date: '2026-03-12T10:00:00.000Z',
        metadata: {
          order_source: 'manual',
          customer_name: '客户B',
        },
        created_at: '2026-03-29T10:00:00.000Z',
        items: [
          {
            supplier: '测试供应商',
            name: '包装箱',
            model: 'PK-1',
            spec: '900*2050',
            quantity: 2,
            unit: '套',
          }
        ]
      } as OrderCreateInput),
      (error: { code: string; existingOrder: { order_no: string; id: number } }) => {
        assert.equal(error.code, 'DUPLICATE_ORDER');
        assert.equal(error.existingOrder.order_no, existingOrder.order_no);
        assert.equal(error.existingOrder.id, existingOrder.id);
        return true;
      },
    );
  } finally {
    orderService.allocateNextManualOrderNo = originalAllocateNextManualOrderNo;
    orderService.assertUniqueOrderNo = originalAssertUniqueOrderNo;
    Order.create = originalOrderCreate;
  }
});

test('OrderService rejects manual orders with only placeholder items', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await assert.rejects(
    () => orderService.createOrder({
      order_no: uniqueOrderNo('MANUAL-INVALID'),
      supplier: '测试供应商',
      category: '包装',
      status: 'draft',
      delivery_date: '2026-03-11T10:00:00.000Z',
      metadata: {
        order_source: 'manual',
        customer_name: '',
      },
      items: [
        {
          name: '',
          spec: '',
          quantity: 0,
          quantity_left: 0,
          quantity_right: 0,
          unit: '套',
        },
      ],
    } as OrderCreateInput),
    (error: any) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(Array.isArray(error.details?.issues), true);
      return true;
    },
  );
});

test('OrderService rejects invalid edits to existing manual orders', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('MANUAL-EDIT'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-11T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    items: [
      {
        name: '纸箱',
        spec: '960*2050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  await assert.rejects(
    () => orderService.updateOrder(created.id, {
      metadata: {
        ...created.metadata,
        customer_name: '',
      },
      items: [
        {
          ...created.items[0],
          name: '',
          spec: '',
          quantity: 0,
          quantity_left: 0,
          quantity_right: 0,
        },
      ],
    } as OrderUpdateInput),
    (error: any) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.equal(Array.isArray(error.details?.issues), true);
      return true;
    },
  );
});

test('OrderService rejects updating manual order number to an existing value', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const first = await orderService.createOrder({
    order_no: 'MANUAL-UPDATE-DUP-001',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-11T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
    },
    items: [
      {
        name: '纸箱A',
        spec: '960*2050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);
  const second = await orderService.createOrder({
    order_no: 'MANUAL-UPDATE-DUP-002',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-11T11:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    items: [
      {
        name: '纸箱B',
        spec: '980*2100',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  await assert.rejects(
    () => orderService.updateOrder(second.id, { order_no: first.order_no } as OrderUpdateInput),
    (error: { code: string; existingOrder: { order_no: string; id: number } }) => {
      assert.equal(error.code, 'DUPLICATE_ORDER');
      assert.equal(error.existingOrder.order_no, first.order_no);
      assert.equal(error.existingOrder.id, first.id);
      return true;
    },
  );
});

test('OrderService allows locked manual orders to update editable fields even with legacy invalid data', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await Order.create({
    order_no: uniqueOrderNo('MANUAL-ARRIVED-LEGACY'),
    supplier: '测试供应商',
    category: '包装',
    status: 'arrived',
    delivery_date: '2026-03-11T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '',
    },
    remark: '',
  });
  await OrderItem.create({
    order_id: created.id,
    name: '纸箱',
    spec: '960*2050',
    quantity: 2,
    ordered_quantity: 2,
    received_quantity: 2,
    quantity_left: 1,
    quantity_right: 1,
    unit: '套',
    price: 0,
  });

  const updated = await orderService.updateOrder(created.id, {
    remark: '允许修改备注',
    delivery_date: '2026-03-20T00:00:00.000Z',
  } as OrderUpdateInput);

  assert.equal(updated.remark, '允许修改备注');
  assert.equal(updated.delivery_date, '2026-03-20T00:00:00.000Z');
  assert.equal(updated.metadata?.customer_name, '');
});

test('OrderService assigns sequential manual order numbers for generated placeholders', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const first = await orderService.createOrder({
    order_no: 'PM-260329-1001',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    created_at: '2026-03-29T08:35:00.000Z',
    delivery_date: '2026-03-29T10:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
    },
    items: [
      {
        name: '纸箱',
        spec: '960*2050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  const second = await orderService.createOrder({
    order_no: 'PM-260329-1001',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    created_at: '2026-03-29T09:12:00.000Z',
    delivery_date: '2026-03-29T12:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    items: [
      {
        name: '木箱',
        spec: '980*2100',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  assert.equal(first.order_no, 'PM-260329-1001');
  assert.equal(second.order_no, 'PM-260329-1002');
  assert.equal(first.metadata?.template_type, 'packaging');
  assert.equal(second.metadata?.template_type, 'packaging');
});

test('OrderService continues manual order sequence past 9999 in a single day', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  await Order.create({
    order_no: 'PM-260329-9999',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-29T09:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
    },
    remark: '',
  });
  await Order.create({
    order_no: 'PM-260329-10000',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-29T09:10:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户B',
    },
    remark: '',
  });

  const created = await orderService.createOrder({
    order_no: 'PM-260329-1001',
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    created_at: '2026-03-29T11:00:00.000Z',
    delivery_date: '2026-03-29T12:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户C',
    },
    items: [
      {
        name: '纸箱',
        spec: '960*2050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  assert.equal(created.order_no, 'PM-260329-10001');
});

test('OrderService infers template_type for legacy orders without metadata field', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await Order.create({
    order_no: uniqueOrderNo('LEGACY-TEMPLATE'),
    supplier: '测试供应商',
    category: '拉手',
    status: 'draft',
    delivery_date: '2026-03-29T09:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
    },
    remark: '',
  });

  const loaded = await orderService.getOrderById(created.id);
  assert.equal(loaded?.metadata?.template_type, 'double-door-accessory');
});

test('OrderService overrides client template_type from category on write', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await orderService.createOrder({
    order_no: uniqueOrderNo('TEMPLATE-MISMATCH'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-29T12:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
      template_type: 'general-accessory',
    },
    items: [
      {
        name: '纸箱',
        spec: '960*2050',
        quantity: 2,
        quantity_left: 1,
        quantity_right: 1,
        unit: '套',
      },
    ],
  } as OrderCreateInput);

  assert.equal(created.metadata?.template_type, 'packaging');
});

test('OrderService does not invent template_type for uncategorized legacy orders', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await Order.create({
    order_no: uniqueOrderNo('LEGACY-NO-CATEGORY'),
    supplier: '测试供应商',
    category: null,
    status: 'draft',
    delivery_date: '2026-03-29T09:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
    },
    remark: '',
  });

  const loaded = await orderService.getOrderById(created.id);
  assert.equal('template_type' in (loaded?.metadata || {}), false);
});

test('OrderService prefers category over persisted mismatched template_type on read', async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  const created = await Order.create({
    order_no: uniqueOrderNo('LEGACY-MISMATCHED-TEMPLATE'),
    supplier: '测试供应商',
    category: '包装',
    status: 'draft',
    delivery_date: '2026-03-29T09:00:00.000Z',
    metadata: {
      order_source: 'manual',
      customer_name: '客户A',
      template_type: 'general-accessory',
    },
    remark: '',
  });

  const loaded = await orderService.getOrderById(created.id);
  assert.equal(loaded?.metadata?.template_type, 'packaging');
});

test.after(async () => {
  if (createdOrderIds.length > 0) {
    await OrderItem.destroy({ where: { order_id: createdOrderIds } });
    await Order.destroy({ where: { id: createdOrderIds } });
  }
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
