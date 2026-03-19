import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)

const modulePath = _require.resolve('../server/services/printSnapshotStore')

function loadStoreWithEnv(overrides: Record<string, string> = {}) {
  const previous: Record<string, string | undefined> = {}
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key]
    process.env[key] = value
  }

  delete _require.cache[modulePath]
  const store = _require(modulePath)

  return {
    store,
    restore: () => {
      for (const [key, oldValue] of Object.entries(previous)) {
        if (oldValue === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = oldValue
        }
      }
      delete _require.cache[modulePath]
      _require(modulePath)
    }
  }
}

test('printSnapshotStore rejects oversized payload', () => {
  const { store, restore } = loadStoreWithEnv({
    PRINT_SNAPSHOT_MAX_PAYLOAD_BYTES: '128'
  })

  try {
    const oversized = { text: 'x'.repeat(20 * 1024) }
    assert.throws(
      () => store.createSnapshot(oversized),
      (error: { code?: string }) => error && error.code === 'SNAPSHOT_PAYLOAD_TOO_LARGE'
    )
  } finally {
    restore()
  }
})

test('printSnapshotStore evicts oldest snapshot when exceeding max entries', () => {
  const { store, restore } = loadStoreWithEnv({
    PRINT_SNAPSHOT_MAX_ENTRIES: '10'
  })

  try {
    const ids: string[] = []
    for (let i = 0; i < 11; i += 1) {
      const snapshot = store.createSnapshot({ idx: i })
      ids.push(snapshot.snapshotId)
    }

    assert.equal(store.getSnapshot(ids[0]), null)
    assert.ok(store.getSnapshot(ids[10]))
  } finally {
    restore()
  }
})
