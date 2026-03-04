const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const fs = require('fs');
const path = require('path');

const configRoutes = require('../server/routes/configData');

const FORMULAS_FILE = path.join(__dirname, '../public/data/color-formulas.json');

let server;
let baseUrl;
let originalFormulas;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/api/config', configRoutes);

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
  originalFormulas = fs.readFileSync(FORMULAS_FILE, 'utf8');
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('GET/POST /api/config/formulas roundtrip', async () => {
  const getRes = await fetch(`${baseUrl}/api/config/formulas`);
  assert.equal(getRes.status, 200);

  const payload = {
    TEST_FORMULA: {
      bom: [{ materialId: 'T-001', usage: { single: 1, double: 2, paired: 2 } }],
      updatedAt: new Date().toISOString()
    }
  };

  const postRes = await fetch(`${baseUrl}/api/config/formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(postRes.status, 200);

  const verifyRes = await fetch(`${baseUrl}/api/config/formulas`);
  assert.equal(verifyRes.status, 200);
  const after = await verifyRes.json();

  assert.ok(after.TEST_FORMULA);
  assert.equal(after.TEST_FORMULA.bom[0].materialId, 'T-001');
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (originalFormulas !== undefined) {
    fs.writeFileSync(FORMULAS_FILE, originalFormulas);
  }
});
