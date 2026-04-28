import type { HTTPRequest } from 'puppeteer'

export function buildRuntimeConfigSnapshotFixture() {
  return {
    version: 'test-runtime-config',
    publishedAt: new Date(0).toISOString(),
    profiles: {
      material_catalog: {},
      formulas: {},
      packaging: {},
      cylinder: {},
      lock: {},
      handle: {},
      lock_fork: {},
    },
    meta: {
      revisions: {
        material_catalog: null,
        formulas: null,
        packaging: null,
        cylinder: null,
        lock: null,
        handle: null,
        lock_fork: null,
      },
      degradedProfiles: ['test-fixture'],
    },
  }
}

export function respondToRuntimeConfigSnapshotRequest(req: HTTPRequest) {
  if (!req.url().includes('/api/runtime/config-snapshot')) return false

  req.respond({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(buildRuntimeConfigSnapshotFixture()),
  })
  return true
}
