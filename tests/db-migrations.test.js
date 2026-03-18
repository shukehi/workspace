const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Sequelize } = require('sequelize');

function purgeServerModules() {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('/server/config/database')
      || key.includes('/server/models/')
      || key.includes('/server/db/')) {
      delete require.cache[key];
    }
  });
}

async function createLegacySchema(storagePath) {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
  });

  await sequelize.query(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no VARCHAR(255) NOT NULL,
      supplier VARCHAR(255),
      status VARCHAR(255),
      metadata JSON,
      created_at DATETIME,
      delivery_date DATETIME,
      updated_at DATETIME
    )
  `);
  await sequelize.query(`
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      model VARCHAR(255),
      quantity FLOAT DEFAULT 0,
      unit VARCHAR(255),
      price FLOAT DEFAULT 0,
      remark VARCHAR(255)
    )
  `);
  await sequelize.query(`
    CREATE TABLE inventory_receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      order_no VARCHAR(255) NOT NULL,
      order_item_id INTEGER,
      material_id VARCHAR(255) NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      supplier VARCHAR(255),
      quantity FLOAT NOT NULL DEFAULT 0,
      unit VARCHAR(255),
      receipt_date DATETIME NOT NULL,
      operator VARCHAR(255),
      remark TEXT NOT NULL DEFAULT '',
      created_at DATETIME,
      updated_at DATETIME
    )
  `);
  await sequelize.query(`
    CREATE TABLE materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      model VARCHAR(255),
      supplier VARCHAR(255),
      unit VARCHAR(255) DEFAULT 'PCS',
      price FLOAT DEFAULT 0,
      category VARCHAR(255),
      createdAt DATETIME,
      updatedAt DATETIME
    )
  `);
  await sequelize.query(`
    CREATE TABLE order_idempotency_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME,
      updated_at DATETIME
    )
  `);

  await sequelize.close();
}

test('initDB applies additive migrations onto legacy sqlite schema', async () => {
  const tempDbPath = path.join(os.tmpdir(), `db-migrations-${Date.now()}.sqlite`);
  process.env.DB_STORAGE = tempDbPath;
  await createLegacySchema(tempDbPath);

  purgeServerModules();
  const { initDB, sequelize } = require('../server/models');
  const { MIGRATIONS_TABLE } = require('../server/db/migrate');

  try {
    await initDB();
    const queryInterface = sequelize.getQueryInterface();
    const orders = await queryInterface.describeTable('orders');
    const orderItems = await queryInterface.describeTable('order_items');
    const inventoryReceipts = await queryInterface.describeTable('inventory_receipts');
    const materials = await queryInterface.describeTable('materials');
    const idempotency = await queryInterface.describeTable('order_idempotency_keys');

    assert.ok(orders.category);
    assert.ok(orders.dedupe_key);
    assert.ok(orderItems.material_id);
    assert.ok(orderItems.received_quantity);
    assert.ok(inventoryReceipts.direction);
    assert.ok(materials.package_spec);
    assert.ok(materials.aliases);
    assert.ok(idempotency.scope);
    assert.ok(idempotency.active);

    const [rows] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id`);
    assert.deepEqual(rows.map((row) => row.id), [
      '20260313-001-add-order-columns',
      '20260313-002-add-order-item-columns',
      '20260313-003-add-inventory-receipt-columns',
      '20260313-004-add-material-columns',
      '20260313-005-add-order-idempotency-columns-and-index',
      '20260318-006-add-query-indexes',
    ]);
  } finally {
    await sequelize.close();
    purgeServerModules();
    delete process.env.DB_STORAGE;
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  }
});
