import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

const servicePath = _require.resolve('../server/services/pdfGenerator')
const routePath = _require.resolve('../server/routes/pdf')

const originalServiceModule = _require(servicePath)

let lastPdfCall: Record<string, unknown> | null = null

async function startServer() {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use('/api/pdf', _require(routePath))

  return await new Promise<{ server: ReturnType<typeof app.listen>; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const addr = s.address() as { port: number }
      const { port } = addr
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`
      })
    })
  })
}

function mockPdfService() {
  delete _require.cache[servicePath]
  _require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: {
      generatePurchaseOrderPDF: async (options: Record<string, unknown>) => {
        lastPdfCall = options
        return Buffer.from('%PDF-1.4 mocked')
      }
    }
  } as NodeModule
}

function restorePdfService() {
  delete _require.cache[servicePath]
  _require.cache[servicePath] = {
    id: servicePath,
    filename: servicePath,
    loaded: true,
    exports: originalServiceModule
  } as NodeModule
}

async function withMockedPdfRoute(run: (baseUrl: string) => Promise<void>) {
  mockPdfService()
  delete _require.cache[routePath]
  lastPdfCall = null

  const started = await startServer()
  try {
    await run(started.baseUrl)
  } finally {
    await new Promise<void>((resolve) => started.server.close(() => resolve()))
    restorePdfService()
    delete _require.cache[routePath]
  }
}

test('POST /api/pdf/generate returns binary PDF with Content-Disposition header', async () => {
  await withMockedPdfRoute(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poNumber: 'PO-TEST-001',
        category: '包装',
        order: {
          supplier: '测试供应商',
          customerName: '测试客户',
          code: 'PO-TEST-001',
          list: [{ name: '测试明细', quantity: 1 }]
        }
      })
    })

    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'application/pdf')
    assert.equal(
      res.headers.get('content-disposition'),
      'attachment; filename="%E6%B5%8B%E8%AF%95%E4%BE%9B%E5%BA%94%E5%95%86%20%E5%8C%85%E8%A3%85%20PO-TEST-001%20%E9%A2%90%E5%AE%B6%E9%87%87%E8%B4%AD%E8%AE%A2%E5%8D%95.pdf"'
    )

    const content = Buffer.from(await res.arrayBuffer()).toString('utf8')
    assert.match(content, /^%PDF-1\.4/)

    assert.ok(lastPdfCall)
    assert.equal(lastPdfCall.poNumber, 'PO-TEST-001')
    const renderUrl = new URL(lastPdfCall.renderUrl as string)
    assert.equal(renderUrl.pathname, '/print-document')
    assert.ok(renderUrl.searchParams.get('snapshotId'))
    assert.equal(renderUrl.searchParams.get('printMode'), 'signature')
    assert.equal(renderUrl.searchParams.get('embedded'), '1')
  })
})

test('POST /api/pdf/generate supports orderId source and ignores client renderBaseUrl', async () => {
  await withMockedPdfRoute(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poNumber: 'PO-ORDER-ID-001',
        orderId: '321',
        printMode: 'compact',
        renderBaseUrl: 'https://evil.example.com'
      })
    })

    assert.equal(res.status, 200)
    assert.ok(lastPdfCall)
    assert.equal(lastPdfCall.poNumber, 'PO-ORDER-ID-001')
    const renderUrl = new URL(lastPdfCall.renderUrl as string)
    assert.equal(renderUrl.pathname, '/print-document')
    assert.equal(renderUrl.searchParams.get('orderId'), '321')
    assert.equal(renderUrl.searchParams.get('printMode'), 'compact')
    assert.equal(renderUrl.host, new URL(baseUrl).host)
  })
})

test('POST /api/pdf/generate prefers origin host in non-production', async () => {
  const oldNodeEnv = process.env.NODE_ENV
  const oldRenderBase = process.env.PRINT_RENDER_BASE_URL
  try {
    process.env.NODE_ENV = 'development'
    delete process.env.PRINT_RENDER_BASE_URL

    await withMockedPdfRoute(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost:5173',
        },
        body: JSON.stringify({
          poNumber: 'PO-ORIGIN-001',
          orderId: '9527',
        })
      })

      assert.equal(res.status, 200)
      assert.ok(lastPdfCall)
      const renderUrl = new URL(lastPdfCall.renderUrl as string)
      assert.equal(renderUrl.host, 'localhost:5173')
    })
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldNodeEnv
    if (oldRenderBase === undefined) delete process.env.PRINT_RENDER_BASE_URL
    else process.env.PRINT_RENDER_BASE_URL = oldRenderBase
  }
})

test('POST /api/pdf/generate requires configured render base url in production', async () => {
  const oldNodeEnv = process.env.NODE_ENV
  const oldRenderBase = process.env.PRINT_RENDER_BASE_URL
  const oldPdfRenderBase = process.env.PDF_RENDER_BASE_URL
  try {
    process.env.NODE_ENV = 'production'
    delete process.env.PRINT_RENDER_BASE_URL
    delete process.env.PDF_RENDER_BASE_URL

    await withMockedPdfRoute(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poNumber: 'PO-PROD-001',
          orderId: '9528',
        })
      })

      assert.equal(res.status, 500)
      const body = await res.json() as { success: boolean; message?: string }
      assert.equal(body.success, false)
      assert.match(String(body.message || ''), /PRINT_RENDER_BASE_URL is required in production/)
    })
  } finally {
    if (oldNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldNodeEnv
    if (oldRenderBase === undefined) delete process.env.PRINT_RENDER_BASE_URL
    else process.env.PRINT_RENDER_BASE_URL = oldRenderBase
    if (oldPdfRenderBase === undefined) delete process.env.PDF_RENDER_BASE_URL
    else process.env.PDF_RENDER_BASE_URL = oldPdfRenderBase
  }
})

test('POST /api/pdf/generate validates required fields', async () => {
  await withMockedPdfRoute(async (baseUrl) => {
    const missingSourceRes = await fetch(`${baseUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    assert.equal(missingSourceRes.status, 400)
    const missingSourceBody = await missingSourceRes.json() as { success: boolean }
    assert.equal(missingSourceBody.success, false)

    const invalidSnapshotRes = await fetch(`${baseUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poNumber: 'PO-TEST-002',
        snapshotId: 'not-found-id'
      })
    })
    assert.equal(invalidSnapshotRes.status, 400)
    const invalidSnapshotBody = await invalidSnapshotRes.json() as { success: boolean }
    assert.equal(invalidSnapshotBody.success, false)
  })
})
