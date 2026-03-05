const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const servicePath = require.resolve('../server/services/pdfGenerator');
const routePath = require.resolve('../server/routes/pdf');

const originalServiceModule = require(servicePath);

let server;
let baseUrl;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/pdf', require(routePath));

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

function mockPdfService() {
  delete require.cache[servicePath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
      generatePurchaseOrderPDF: async () => Buffer.from('%PDF-1.4 mocked')
    }
  };
}

function restorePdfService() {
  delete require.cache[servicePath];
  require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: originalServiceModule
  };
}

test.before(async () => {
  mockPdfService();
  delete require.cache[routePath];
  const started = await startServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

test('POST /api/pdf/generate returns binary PDF with Content-Disposition header', async () => {
  const res = await fetch(`${baseUrl}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      poNumber: 'PO-TEST-001',
      category: '包装',
      order: {
        customerName: '测试客户',
        code: 'PO-TEST-001',
        list: [{ name: '测试明细', quantity: 1 }]
      }
    })
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.equal(
    res.headers.get('content-disposition'),
    'attachment; filename="PO-TEST-001.pdf"'
  );

  const content = Buffer.from(await res.arrayBuffer()).toString('utf8');
  assert.match(content, /^%PDF-1\.4/);
});

test('POST /api/pdf/generate validates required fields', async () => {
  const missingFieldRes = await fetch(`${baseUrl}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order: { list: [] }
    })
  });
  assert.equal(missingFieldRes.status, 400);
  const missingFieldBody = await missingFieldRes.json();
  assert.equal(missingFieldBody.success, false);

  const invalidListRes = await fetch(`${baseUrl}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      poNumber: 'PO-TEST-002',
      order: { customerName: 'x', code: 'PO-TEST-002' }
    })
  });
  assert.equal(invalidListRes.status, 400);
  const invalidListBody = await invalidListRes.json();
  assert.equal(invalidListBody.success, false);
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  restorePdfService();
  delete require.cache[routePath];
});
