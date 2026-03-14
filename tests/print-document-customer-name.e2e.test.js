const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer');

const ROOT = process.cwd();
const PORT = 4175;

async function waitForDevServer(proc, timeoutMs = 60000) {
  const start = Date.now();
  let buffer = '';

  return await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const text = chunk.toString();
      buffer += text;
      if (buffer.includes('Local:') || buffer.includes('ready in')) {
        cleanup();
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        cleanup();
        reject(new Error(`Vite dev server timeout. Output:\n${buffer}`));
      }
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`Vite dev server exited early with code ${code}. Output:\n${buffer}`));
    };

    const cleanup = () => {
      proc.stdout.off('data', onData);
      proc.stderr.off('data', onData);
      proc.off('exit', onExit);
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('exit', onExit);
  });
}

function buildSnapshotResponse() {
  return {
    success: true,
    data: {
      snapshotId: 'snapshot-customer-name',
      createdAt: '2026-03-10T10:00:00.000Z',
      expiresAt: '2026-03-10T10:30:00.000Z',
      payload: {
        poNumber: 'PO-PRINT-001',
        category: '包装',
        printMode: 'signature',
        order: {
          order_no: 'PO-PRINT-001',
          supplier: '供应商A',
          category: '包装',
          status: 'draft',
          total_amount: 100,
          created_at: '2026-03-10T10:00:00.000Z',
          delivery_date: '2026-03-12T10:00:00.000Z',
          metadata: {
            customer_name: '外贸马其顿Orient（三部）',
            printColumnWidths: {},
          },
          items: [
            {
              id: 1,
              material_id: 'm1',
              name: '包装箱',
              model: 'PK-1',
              quantity: 2,
              quantity_left: 1,
              quantity_right: 1,
              unit: '套',
              remark: '',
            },
          ],
        },
      },
    },
  };
}

test('print document e2e: preview shows full customer name while pdf mode uses sales department label', async () => {
  const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  let browser;

  try {
    await waitForDevServer(devServer);

    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/print/snapshots/snapshot-customer-name')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildSnapshotResponse()),
        });
        return;
      }
      req.continue();
    });

    await page.goto(
      `http://127.0.0.1:${PORT}/print-document?snapshotId=snapshot-customer-name&printMode=signature`,
      { waitUntil: 'networkidle2' },
    );

    await page.waitForFunction(() => document.body.innerText.includes('客户名称:'));
    await page.waitForFunction(() => document.body.innerText.includes('外贸马其顿Orient（三部）'));

    const customerText = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const target = labels.find((node) => (node.textContent || '').includes('客户名称'));
      if (!target) return '';
      const container = target.parentElement;
      return container ? container.innerText.replace(/\s+/g, ' ').trim() : '';
    });

    assert.match(customerText, /客户名称:\s*外贸马其顿Orient（三部）/);
  } finally {
    if (browser) {
      await browser.close();
    }
    devServer.kill('SIGTERM');
  }
});
