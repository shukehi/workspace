const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer');

const ROOT = process.cwd();
const BASELINE_DIR = path.join(ROOT, 'tests', 'visual-baseline');
const BASELINE_FILE = path.join(BASELINE_DIR, 'procurement-layout.hashes.json');
const SHOTS_DIR = path.join(BASELINE_DIR, 'latest');
const PORT = 4174;

const CATEGORY_CASES = [
  { key: 'packaging', filterLabel: '包装材料', category: '包装' },
  { key: 'cylinder', filterLabel: '锁芯', category: '锁芯' },
  { key: 'lock', filterLabel: '锁叉', category: '锁叉' },
  { key: 'hardware', filterLabel: '五金/配件', category: '配件' }
];

function ensureDirs() {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
}

function hashFile(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadBaselines() {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
}

function saveBaselines(data) {
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(data, null, 2));
}

function createMockOrders() {
  const now = '2026-03-05T10:12:13.377Z';
  return [
    {
      id: 101,
      order_no: 'PO-PKG-001',
      supplier: '供应商A',
      category: '包装',
      status: 'draft',
      total_amount: 100,
      created_at: now,
      delivery_date: now,
      metadata: { customer_name: '客户A', printColumnWidths: {} },
      items: [{ id: 1, name: '包装箱', model: 'PK-1', spec: '', mb: '', quantity_left: 1, quantity_right: 2, quantity: 3, unit: '套', remark: '包材' }]
    },
    {
      id: 102,
      order_no: 'PO-CYL-001',
      supplier: '供应商B',
      category: '锁芯',
      status: 'draft',
      total_amount: 100,
      created_at: now,
      delivery_date: now,
      metadata: { customer_name: '客户B', printColumnWidths: {} },
      items: [{ id: 1, name: '锁芯A', type: '锁芯A', eccentricity: '34.5*55.5', quantity: 8, unit: '套', remark: '锁芯备注' }]
    },
    {
      id: 103,
      order_no: 'PO-LOCK-001',
      supplier: '供应商C',
      category: '锁叉',
      status: 'draft',
      total_amount: 100,
      created_at: now,
      delivery_date: now,
      metadata: { customer_name: '客户C', printColumnWidths: {} },
      items: [{ id: 1, name: '锁叉A', type: '锁叉A', spec: 'L-1', quantity: 12, unit: '个', remark: '锁叉备注' }]
    },
    {
      id: 104,
      order_no: 'PO-HW-001',
      supplier: '供应商D',
      category: '配件',
      status: 'draft',
      total_amount: 100,
      created_at: now,
      delivery_date: now,
      metadata: { customer_name: '客户D', printColumnWidths: {} },
      items: [{ id: 1, name: '铰链', type: '铰链', spec: 'HJ-2', quantity: 20, unit: '个', remark: '五金备注' }]
    }
  ];
}

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

async function openCategoryAndShoot(page, filterLabel, shotKey) {
  await clickButtonByText(page, filterLabel);
  await delay(250);

  const previewBtn = await page.$('button[title="查看/打印"]');
  assert.ok(previewBtn, `missing preview button for ${shotKey}`);
  await previewBtn.click();
  await page.waitForSelector('text=颐家工贸 (  总厂  ) 采购订单预览');
  await stabilizeForShot(page);

  const previewPath = path.join(SHOTS_DIR, `${shotKey}-preview.png`);
  const previewDialog = await page.$('[role=\"dialog\"]');
  assert.ok(previewDialog, `missing preview dialog for ${shotKey}`);
  await previewDialog.screenshot({ path: previewPath });

  await clickButtonByText(page, '关闭');
  await delay(150);

  const editBtn = await page.$('button[title="编辑订单"]');
  assert.ok(editBtn, `missing edit button for ${shotKey}`);
  await editBtn.click();
  await page.waitForSelector('text=编辑颐家工贸 (  总厂  ) 采购订单');
  await stabilizeForShot(page);

  const editPath = path.join(SHOTS_DIR, `${shotKey}-edit.png`);
  const editDialog = await page.$('[role=\"dialog\"]');
  assert.ok(editDialog, `missing edit dialog for ${shotKey}`);
  await editDialog.screenshot({ path: editPath });

  await clickButtonByText(page, '取消');
  await delay(150);

  return {
    [`${shotKey}-preview`]: hashFile(previewPath),
    [`${shotKey}-edit`]: hashFile(editPath)
  };
}

async function clickButtonByText(page, text) {
  const clicked = await page.evaluate((targetText) => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const target = buttons.find((btn) => (btn.textContent || '').includes(targetText));
    if (!target) return false;
    target.click();
    return true;
  }, text);
  assert.ok(clicked, `button not found: ${text}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stabilizeForShot(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `
  });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.scrollTo(0, 0);
  });
  await page.mouse.move(1, 1);
  await delay(80);
}

test('procurement visual regression: edit and preview layouts remain stable', { skip: !process.env.RUN_VISUAL_TESTS }, async () => {
  ensureDirs();

  const devServer = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' }
  });

  try {
    await waitForDevServer(devServer);

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });

    await page.setRequestInterception(true);
    const mockOrders = createMockOrders();
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/orders')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockOrders)
        });
        return;
      }
      req.continue();
    });

    await page.goto(`http://127.0.0.1:${PORT}/procurement`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('text=采购管理');
    await page.waitForSelector('button[title="查看/打印"]');

    let currentHashes = {};
    for (const item of CATEGORY_CASES) {
      const hashes = await openCategoryAndShoot(page, item.filterLabel, item.key);
      currentHashes = { ...currentHashes, ...hashes };
    }

    await browser.close();

    if (process.env.UPDATE_VISUAL_BASELINE) {
      saveBaselines(currentHashes);
      return;
    }

    const baselines = loadBaselines();
    assert.ok(Object.keys(baselines).length > 0, `Missing baseline file: ${BASELINE_FILE}. Run with UPDATE_VISUAL_BASELINE=1.`);
    assert.deepEqual(currentHashes, baselines);
  } finally {
    devServer.kill('SIGTERM');
  }
});
