import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import puppeteer from 'puppeteer'
import { respondToRuntimeConfigSnapshotRequest } from './helpers/runtime-config-snapshot-fixture'

const ROOT = process.cwd()
const PORT = 4175
const LEGACY_LOCK_FORK_PORT = 4176

async function waitForDevServer(proc: ReturnType<typeof spawn>, timeoutMs = 60000) {
  const start = Date.now()
  let buffer = ''

  return await new Promise<void>((resolve, reject) => {
    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      buffer += text
      if (buffer.includes('Local:') || buffer.includes('ready in')) {
        cleanup()
        resolve()
      } else if (Date.now() - start > timeoutMs) {
        cleanup()
        reject(new Error(`Vite dev server timeout. Output:\n${buffer}`))
      }
    }

    const onExit = (code: number | null) => {
      cleanup()
      reject(new Error(`Vite dev server exited early with code ${code}. Output:\n${buffer}`))
    }

    const cleanup = () => {
      proc.stdout!.off('data', onData)
      proc.stderr!.off('data', onData)
      proc.off('exit', onExit)
    }

    proc.stdout!.on('data', onData)
    proc.stderr!.on('data', onData)
    proc.on('exit', onExit)
  })
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
  }
}

function buildLegacyLockForkSnapshotResponse() {
  return {
    success: true,
    data: {
      snapshotId: 'snapshot-legacy-lock-fork',
      createdAt: '2026-03-10T10:00:00.000Z',
      expiresAt: '2026-03-10T10:30:00.000Z',
      payload: {
        poNumber: 'PO-LEGACY-LOCK-FORK',
        category: '锁叉',
        printMode: 'signature',
        order: {
          order_no: 'PO-LEGACY-LOCK-FORK',
          supplier: '锁叉旧供应商',
          category: '锁叉',
          status: 'draft',
          total_amount: 100,
          created_at: '2026-03-10T10:00:00.000Z',
          delivery_date: '2026-03-12T10:00:00.000Z',
          metadata: {
            customer_name: '历史客户',
            printColumnWidths: {},
          },
          items: [
            {
              id: 1,
              supplier: '锁叉旧供应商',
              type: '单头锁叉 - 上头',
              spec: '570*301 = 871',
              quantity: 9,
              unit: '个',
              remark: '7CM 2100',
            },
          ],
        },
      },
    },
  }
}

test('print document e2e: print route shows sales department label', async () => {
  const devServer = spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

  try {
    await waitForDevServer(devServer)

    browser = await puppeteer.launch({ headless: 'new' as unknown as boolean })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
    await page.setRequestInterception(true)

    page.on('request', (req) => {
      const url = req.url()
      if (respondToRuntimeConfigSnapshotRequest(req)) return

      if (url.includes('/api/print/snapshots/snapshot-customer-name')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildSnapshotResponse()),
        })
        return
      }
      req.continue()
    })

    await page.goto(
      `http://127.0.0.1:${PORT}/print-document?snapshotId=snapshot-customer-name&printMode=signature`,
      { waitUntil: 'networkidle2' },
    )

    await page.waitForFunction(() => document.body.innerText.includes('客户名称:'))
    await page.waitForFunction(() => document.body.innerText.includes('三部'))

    const customerText = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'))
      const target = labels.find((node) => (node.textContent || '').includes('客户名称'))
      if (!target) return ''
      const container = target.parentElement
      return container ? (container as HTMLElement).innerText.replace(/\s+/g, ' ').trim() : ''
    })

    assert.match(customerText, /客户名称:\s*三部/)
  } finally {
    if (browser) {
      await browser.close()
    }
    devServer.kill('SIGTERM')
  }
})

test('print document e2e: legacy lock fork snapshot renders single-quantity print layout', async () => {
  const devServer = spawn('npm', ['run', 'dev:web', '--', '--host', '127.0.0.1', '--port', String(LEGACY_LOCK_FORK_PORT)], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  })

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined

  try {
    await waitForDevServer(devServer)

    browser = await puppeteer.launch({ headless: 'new' as unknown as boolean })
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 })
    await page.setRequestInterception(true)

    page.on('request', (req) => {
      const url = req.url()
      if (respondToRuntimeConfigSnapshotRequest(req)) return

      if (url.includes('/api/print/snapshots/snapshot-legacy-lock-fork')) {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildLegacyLockForkSnapshotResponse()),
        })
        return
      }
      req.continue()
    })

    await page.goto(
      `http://127.0.0.1:${LEGACY_LOCK_FORK_PORT}/print-document?snapshotId=snapshot-legacy-lock-fork&printMode=signature`,
      { waitUntil: 'networkidle2' },
    )

    await page.waitForSelector('#printDocumentOutput table')
    await page.waitForFunction(() => document.body.innerText.includes('单头锁叉 - 上头'))

    const routeText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim())
    assert.match(routeText, /PO-LEGACY-LOCK-FORK/)
    assert.match(routeText, /锁叉旧供应商/)
    assert.match(routeText, /单头锁叉 - 上头/)
    assert.match(routeText, /570\*301 = 871/)
    assert.match(routeText, /7CM 2100/)

    const headers = await page.$$eval('#printDocumentOutput th', (nodes) => nodes.map((node) => (node.textContent || '').trim()))
    assert.deepEqual(headers, ['序号', '产品名称', '规格', '数量', '单位', '备注'])
    assert.equal(headers.includes('左数量'), false)
    assert.equal(headers.includes('右数量'), false)
  } finally {
    if (browser) {
      await browser.close()
    }
    devServer.kill('SIGTERM')
  }
})
