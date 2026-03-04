const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('node:fs');
const path = require('node:path');

const TEST_DB = path.join('/tmp', 'order-search-inventory-route.test.sqlite');
process.env.DB_STORAGE = TEST_DB;

const { sequelize, Material } = require('../server/models');
const inventoryRoutes = require('../server/routes/inventory');

const createdMaterialIds = [];
let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);

  return await new Promise((resolve) => {
    const s = app.listen(0, () => {
      const { port } = s.address();
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`
      });
    });
  });
}

test.before(async () => {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('GET /api/inventory and PUT /api/inventory/:id', async () => {
  const material = await Material.create({
    code: `TEST-MAT-${Date.now()}`,
    name: 'Inventory Test Material',
    model: 'INV-MODEL',
    category: '测试',
    supplier: 'Inventory Supplier',
    unit: 'pcs',
    stock_quantity: 12,
    min_stock: 5
  });

  createdMaterialIds.push(material.id);

  const listRes = await fetch(`${baseUrl}/api/inventory`);
  assert.equal(listRes.status, 200);
  const list = await listRes.json();

  const found = list.find((x) => x.id === material.id);
  assert.ok(found);
  assert.equal(typeof found.id, 'number');
  assert.equal(found.stock_quantity, 12);

  const updateRes = await fetch(`${baseUrl}/api/inventory/${material.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock_quantity: 99, min_stock: 20 })
  });

  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.equal(updated.stock_quantity, 99);
  assert.equal(updated.min_stock, 20);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (createdMaterialIds.length > 0) {
    await Material.destroy({ where: { id: createdMaterialIds } });
  }
  await sequelize.close();
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});
