import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

const routePath = _require.resolve('../server/routes/print')

let server: ReturnType<typeof express.application.listen> | undefined
let baseUrl: string

async function startServer() {
  const app = express()
  app.use(express.json({ limit: '2mb' }))
  app.use('/api/print', (_require(routePath).default ?? _require(routePath)) as express.Router)

  return await new Promise<{ server: ReturnType<typeof app.listen>; baseUrl: string }>((resolve) => {
    const s = app.listen(0, () => {
      const addr = s.address() as { port: number }
      const { port } = addr
      resolve({
        server: s,
        baseUrl: `http://127.0.0.1:${port}`,
      })
    })
  })
}

test.before(async () => {
  const started = await startServer()
  server = started.server
  baseUrl = started.baseUrl
})

test('POST/GET /api/print/snapshots can store and load snapshot payload', async () => {
  const createRes = await fetch(`${baseUrl}/api/print/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      poNumber: 'PO-SNAPSHOT-001',
      category: '包装',
      printMode: 'compact',
      order: {
        code: 'PO-SNAPSHOT-001',
        list: [{ name: '测试明细', quantity: 1 }],
      },
    }),
  })

  assert.equal(createRes.status, 200)
  const createBody = await createRes.json() as { success: boolean; data: { snapshotId: string } }
  assert.equal(createBody.success, true)
  assert.ok(createBody.data.snapshotId)

  const snapshotId = createBody.data.snapshotId
  const getRes = await fetch(`${baseUrl}/api/print/snapshots/${encodeURIComponent(snapshotId)}`)
  assert.equal(getRes.status, 200)

  const getBody = await getRes.json() as { success: boolean; data: { snapshotId: string; payload: { poNumber: string; printMode: string } } }
  assert.equal(getBody.success, true)
  assert.equal(getBody.data.snapshotId, snapshotId)
  assert.equal(getBody.data.payload.poNumber, 'PO-SNAPSHOT-001')
  assert.equal(getBody.data.payload.printMode, 'compact')
})

test('GET /api/print/snapshots/:id returns 404 for missing snapshot', async () => {
  const res = await fetch(`${baseUrl}/api/print/snapshots/not-found`)
  assert.equal(res.status, 404)
  const body = await res.json() as { success: boolean }
  assert.equal(body.success, false)
})

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server!.close(() => resolve()))
  }
  delete _require.cache[routePath]
})
