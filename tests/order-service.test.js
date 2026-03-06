const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = path.join('/tmp', 'order-search-order-service.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Order, OrderItem } = require('../server/models');
const orderService = require('../server/services/OrderService');

const createdOrderIds = [];

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
  assert.equal(created.remark, '整单备注-创建');
  assert.equal(created.items[0].remark, 'created by test');

  const fetched = await orderService.getOrderById(created.id);
  assert.ok(fetched);
  assert.equal(fetched.order_no, orderNo);

  const filtered = await orderService.getAllOrders('包装');
  assert.ok(filtered.some((o) => o.id === created.id));

  const nextCreatedAt = '2026-02-01T00:00:00.000Z';
  const updated = await orderService.updateOrder(created.id, {
    category: '锁芯',
    status: 'processing',
    created_at: nextCreatedAt,
    remark: '整单备注-更新'
  });

  assert.equal(updated.category, '锁芯');
  assert.equal(updated.status, 'processing');
  assert.equal(new Date(updated.created_at).toISOString(), nextCreatedAt);
  assert.equal(updated.remark, '整单备注-更新');
  assert.equal(updated.items[0].remark, 'created by test');

  const filteredAfterUpdate = await orderService.getAllOrders('锁芯');
  assert.ok(filteredAfterUpdate.some((o) => o.id === created.id));

  await orderService.deleteOrder(created.id);

  const afterDelete = await orderService.getOrderById(created.id);
  assert.equal(afterDelete, null);
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

test.after(async () => {
  if (createdOrderIds.length > 0) {
    await OrderItem.destroy({ where: { order_id: createdOrderIds } });
    await Order.destroy({ where: { id: createdOrderIds } });
  }
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
