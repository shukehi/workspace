import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Sequelize } from 'sequelize'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

function purgeServerModules() {
  Object.keys(_require.cache).forEach((key) => {
    if (key.includes('/server/config/database')
      || key.includes('/server/models/')
      || key.includes('/server/db/')) {
      delete _require.cache[key];
    }
  });
}

async function createLegacySchema(storagePath: string) {
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
      stock_quantity FLOAT DEFAULT 7,
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

  await sequelize.query(`
    INSERT INTO materials (code, name, model, supplier, unit, price, category, stock_quantity)
    VALUES ('LEGACY-MAT-001', 'Legacy Material', 'LEGACY', 'Legacy Supplier', 'pcs', 10, '测试', 7)
  `);
  await sequelize.query(`
    INSERT INTO orders (order_no, supplier, status, metadata, created_at, delivery_date, updated_at)
    VALUES ('LEGACY-PO-001', 'Legacy Supplier', 'completed', '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  await sequelize.query(`
    INSERT INTO inventory_receipts (order_id, order_no, order_item_id, material_id, item_name, supplier, quantity, unit, receipt_date, operator, remark, created_at, updated_at)
    VALUES (1, 'LEGACY-PO-001', NULL, 'LEGACY-MAT-001', 'Legacy Material', 'Legacy Supplier', 7, 'pcs', CURRENT_TIMESTAMP, 'Legacy User', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  await sequelize.close();
}

test('initDB applies additive migrations onto legacy sqlite schema', async () => {
  const tempDbPath = path.join(os.tmpdir(), `db-migrations-${Date.now()}.sqlite`);
  process.env.DB_STORAGE = tempDbPath;
  await createLegacySchema(tempDbPath);

  purgeServerModules();
  const { initDB, sequelize } = _require('../server/models');
  const { MIGRATIONS_TABLE } = _require('../server/db/migrate');

  try {
    await initDB();
    const queryInterface = sequelize.getQueryInterface();
    const orders = await queryInterface.describeTable('orders');
    const orderItems = await queryInterface.describeTable('order_items');
    const inventoryReceipts = await queryInterface.describeTable('inventory_receipts');
    const materials = await queryInterface.describeTable('materials');
    const idempotency = await queryInterface.describeTable('order_idempotency_keys');
    const warehouses = await queryInterface.describeTable('warehouses');
    const inventoryLocations = await queryInterface.describeTable('inventory_locations');
    const inventoryLocationBalances = await queryInterface.describeTable('inventory_location_balances');
    const inventoryOutbounds = await queryInterface.describeTable('inventory_outbounds');
    const inventoryOutboundItems = await queryInterface.describeTable('inventory_outbound_items');
    const inventoryMovements = await queryInterface.describeTable('inventory_movements');

    assert.ok(orders.category);
    assert.ok(orders.dedupe_key);
    assert.ok(orderItems.material_id);
    assert.ok(orderItems.received_quantity);
    assert.ok(inventoryReceipts.direction);
    assert.ok(inventoryReceipts.reverse_version);
    assert.ok(inventoryReceipts.warehouse_id);
    assert.ok(inventoryReceipts.location_id);
    assert.ok(materials.package_spec);
    assert.ok(materials.aliases);
    assert.ok(idempotency.scope);
    assert.ok(idempotency.active);
    assert.ok(warehouses.code);
    assert.ok(inventoryLocations.warehouse_id);
    assert.ok(inventoryLocationBalances.location_id);
    assert.ok(inventoryOutbounds.outbound_no);
    assert.ok(inventoryOutboundItems.outbound_id);
    assert.ok(inventoryMovements.source_type);
    assert.ok(inventoryMovements.source_id);
    assert.ok(inventoryMovements.source_line_key);

    const [defaultWarehouses] = await sequelize.query(`SELECT code FROM warehouses ORDER BY id`);
    assert.deepEqual((defaultWarehouses as Array<{ code: string }>).map((row) => row.code), ['DEFAULT']);
    const [defaultLocations] = await sequelize.query(`SELECT code FROM inventory_locations ORDER BY id`);
    assert.deepEqual((defaultLocations as Array<{ code: string }>).map((row) => row.code), ['UNASSIGNED']);
    const [receiptRows] = await sequelize.query(`SELECT warehouse_id, location_id FROM inventory_receipts ORDER BY id`);
    assert.equal(Number((receiptRows as Array<{ warehouse_id: number }>)[0].warehouse_id) > 0, true);
    assert.equal(Number((receiptRows as Array<{ location_id: number }>)[0].location_id) > 0, true);
    const [balanceRows] = await sequelize.query(`SELECT quantity FROM inventory_location_balances ORDER BY id`);
    assert.equal(Number((balanceRows as Array<{ quantity: number }>)[0].quantity), 7);

    const [rows] = await sequelize.query(`SELECT id FROM ${MIGRATIONS_TABLE} ORDER BY id`);
    assert.deepEqual((rows as { id: string }[]).map((row) => row.id), [
      '20260313-001-add-order-columns',
      '20260313-002-add-order-item-columns',
      '20260313-003-add-inventory-receipt-columns',
      '20260313-004-add-material-columns',
      '20260313-005-add-order-idempotency-columns-and-index',
      '20260318-006-add-query-indexes',
      '20260320-007-add-inventory-location-and-outbound',
      '20260320-008-add-inventory-reversal-guards',
      '20260329-009-add-inventory-movements',
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
