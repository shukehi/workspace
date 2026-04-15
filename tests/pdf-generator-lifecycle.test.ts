import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const servicePath = _require.resolve('../server/services/pdfGenerator');
const puppeteerPath = _require.resolve('puppeteer');

const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const originalPuppeteerModule = _require.cache[puppeteerPath];

type FakeTimer = {
  id: number;
  fn: () => void;
};

function createFakeBrowser() {
  const metrics = {
    newPageCalls: 0,
    pageCloseCalls: 0,
    browserCloseCalls: 0,
    pdfCalls: 0,
  };

  const browser = {
    connected: true,
    async newPage() {
      metrics.newPageCalls += 1;
      if (!browser.connected) {
        throw new Error('browser closed');
      }
      return {
        async goto() { return undefined; },
        async setViewport() { return undefined; },
        async waitForFunction() { return undefined; },
        async evaluate() { return ''; },
        async emulateMediaType() { return undefined; },
        async evaluateHandle() { return undefined; },
        async pdf() {
          metrics.pdfCalls += 1;
          return Buffer.from('%PDF-1.4 mocked');
        },
        async screenshot() {
          return Buffer.from('png');
        },
        async close() {
          metrics.pageCloseCalls += 1;
        },
      };
    },
    async close() {
      metrics.browserCloseCalls += 1;
      browser.connected = false;
    },
  };

  return { browser, metrics };
}

function installFakeTimers() {
  const timers = new Map<number, FakeTimer>();
  let nextId = 1;

  global.setTimeout = ((fn: (...args: any[]) => void, _delay?: number) => {
    const id = nextId += 1;
    timers.set(id, {
      id,
      fn: () => fn(),
    });
    return id as unknown as NodeJS.Timeout;
  }) as typeof setTimeout;

  global.clearTimeout = ((id: NodeJS.Timeout) => {
    timers.delete(id as unknown as number);
  }) as typeof clearTimeout;

  return {
    runAll() {
      const current = Array.from(timers.values());
      timers.clear();
      current.forEach((timer) => timer.fn());
    },
    restore() {
      global.setTimeout = originalSetTimeout;
      global.clearTimeout = originalClearTimeout;
    },
  };
}

function loadPdfService(fakeLaunch: () => Promise<any>) {
  delete _require.cache[servicePath];
  delete _require.cache[puppeteerPath];
  _require.cache[puppeteerPath] = {
    id: puppeteerPath,
    filename: puppeteerPath,
    loaded: true,
    exports: {
      __esModule: true,
      default: { launch: fakeLaunch },
      launch: fakeLaunch,
    },
  } as NodeModule;

  return _require(servicePath) as typeof import('../server/services/pdfGenerator');
}

function restoreModules() {
  delete _require.cache[servicePath];
  delete _require.cache[puppeteerPath];
  if (originalPuppeteerModule) {
    _require.cache[puppeteerPath] = originalPuppeteerModule;
  }
}

test('pdf generator lifecycle: prewarm and repeated renders reuse the same browser', async () => {
  const fakeTimers = installFakeTimers();
  const fake = createFakeBrowser();
  let launchCalls = 0;
  const service = loadPdfService(async () => {
    launchCalls += 1;
    return fake.browser;
  });

  try {
    await service.prewarmPdfRenderer();
    await service.generatePurchaseOrderPDF({ poNumber: 'PO-1', renderUrl: 'http://localhost/print-document?snapshotId=1' });
    await service.generatePurchaseOrderPDF({ poNumber: 'PO-2', renderUrl: 'http://localhost/print-document?snapshotId=2' });

    assert.equal(launchCalls, 1);
    assert.equal(fake.metrics.newPageCalls, 3);
    assert.equal(fake.metrics.browserCloseCalls, 0);
  } finally {
    await service.shutdownPdfRenderer();
    fakeTimers.restore();
    restoreModules();
  }
});

test('pdf generator lifecycle: idle close does not kill a new in-flight render reservation', async () => {
  const fakeTimers = installFakeTimers();
  const fake = createFakeBrowser();
  let launchCalls = 0;
  const service = loadPdfService(async () => {
    launchCalls += 1;
    return fake.browser;
  });

  try {
    await service.prewarmPdfRenderer();
    const renderPromise = service.generatePurchaseOrderPDF({
      poNumber: 'PO-RACE',
      renderUrl: 'http://localhost/print-document?snapshotId=race',
    });

    fakeTimers.runAll();
    const pdf = await renderPromise;

    assert.match(pdf.toString('utf8'), /^%PDF-1\.4/);
    assert.equal(launchCalls, 1);
    assert.equal(fake.metrics.browserCloseCalls, 0);
  } finally {
    await service.shutdownPdfRenderer();
    fakeTimers.restore();
    restoreModules();
  }
});

test('pdf generator lifecycle: shutdown closes shared browser and next render relaunches', async () => {
  const fakeTimers = installFakeTimers();
  const first = createFakeBrowser();
  const second = createFakeBrowser();
  const browsers = [first.browser, second.browser];
  let launchCalls = 0;
  const service = loadPdfService(async () => {
    const browser = browsers[launchCalls];
    launchCalls += 1;
    return browser;
  });

  try {
    await service.prewarmPdfRenderer();
    await service.shutdownPdfRenderer();
    await service.generatePurchaseOrderPDF({
      poNumber: 'PO-RELAUNCH',
      renderUrl: 'http://localhost/print-document?snapshotId=relaunch',
    });

    assert.equal(launchCalls, 2);
    assert.equal(first.metrics.browserCloseCalls, 1);
    assert.equal(second.metrics.pdfCalls, 1);
  } finally {
    await service.shutdownPdfRenderer();
    fakeTimers.restore();
    restoreModules();
  }
});
