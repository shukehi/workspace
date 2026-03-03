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
    metadata: { source: 'test' },
    created_at: new Date().toISOString(),
    items: [
      {
        name: 'Test Item',
        model: 'MODEL-X',
        quantity: 3,
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

  const fetched = await orderService.getOrderById(created.id);
  assert.ok(fetched);
  assert.equal(fetched.order_no, orderNo);

  const filtered = await orderService.getAllOrders('包装');
  assert.ok(filtered.some((o) => o.id === created.id));

  const updated = await orderService.updateOrder(created.id, {
    category: '锁芯',
    status: 'processing'
  });

  assert.equal(updated.category, '锁芯');
  assert.equal(updated.status, 'processing');

  const filteredAfterUpdate = await orderService.getAllOrders('锁芯');
  assert.ok(filteredAfterUpdate.some((o) => o.id === created.id));

  await orderService.deleteOrder(created.id);

  const afterDelete = await orderService.getOrderById(created.id);
  assert.equal(afterDelete, null);
});

test.after(async () => {
  if (createdOrderIds.length > 0) {
    await OrderItem.destroy({ where: { order_id: createdOrderIds } });
    await Order.destroy({ where: { id: createdOrderIds } });
  }
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
