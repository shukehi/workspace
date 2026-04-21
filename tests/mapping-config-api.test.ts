import test from 'node:test';
import assert from 'node:assert/strict';
import { mappingConfigApi } from '../src/services/mappingConfigApi';
import { api } from '../src/lib/api';

type ApiLike = typeof api;
const originalGet = api.get;
const originalPut = api.put;
const originalPost = api.post;

test.after(() => {
  api.get = originalGet as ApiLike['get'];
  api.put = originalPut as ApiLike['put'];
  api.post = originalPost as ApiLike['post'];
});

test('mappingConfigApi.loadWorkflow parses unified profile detail shape', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(url);
    if (url === '/config/profiles/packaging/detail') {
      return {
        success: true,
        detail: {
          latestRevision: { revision: 12 },
          draftRevision: { revision: 11 },
          publishedRevision: { revision: 10 },
          draftPayload: { supplierName: '方亮包装', mappings: { 包装A: '外协包装A' } },
          publishedPayload: { supplierName: '旧包装供应商', mappings: { 包装旧: '外协包装旧' } },
        },
      } as any;
    }
    if (url === '/config/profiles/packaging/audit-logs') {
      return {
        success: true,
        items: [{ id: 1, action: 'publish' }],
      } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];

  const result = await mappingConfigApi.loadWorkflow<any>('packaging', '/config/profiles');
  assert.deepEqual(calls, ['/config/profiles/packaging/detail', '/config/profiles/packaging/audit-logs']);
  assert.equal(result.latestRevision, 12);
  assert.equal(result.draftRevision, 11);
  assert.equal(result.publishedRevision, 10);
  assert.equal(result.payload.supplierName, '方亮包装');
  assert.equal(result.auditLogs[0].action, 'publish');
});

test('mappingConfigApi.saveWorkflow uses unified profile draft/publish endpoints', async () => {
  const calls: Array<{ method: string; url: string; body: any }> = [];
  api.put = (async (url: string, body?: unknown) => {
    calls.push({ method: 'PUT', url, body });
    return { success: true, revision: { revision: 21 } } as any;
  }) as ApiLike['put'];
  api.post = (async (url: string, body?: unknown) => {
    calls.push({ method: 'POST', url, body });
    return { success: true, revision: { revision: 22 } } as any;
  }) as ApiLike['post'];

  const payload = { supplierName: '新包装供应商', _changeNote: 'save via profile bridge' };
  const result = await mappingConfigApi.saveWorkflow('packaging', payload, 20, '/config/profiles');

  assert.equal(result.ok, true);
  assert.equal(result.latestRevision, 22);
  assert.deepEqual(calls, [
    {
      method: 'PUT',
      url: '/config/profiles/packaging/draft',
      body: {
        revision: 20,
        payload,
        changeNote: 'save via profile bridge',
      },
    },
    {
      method: 'POST',
      url: '/config/profiles/packaging/publish',
      body: {
        fromRevision: 21,
        changeNote: 'save via profile bridge',
      },
    },
  ]);
});

test('mappingConfigApi.loadWorkflowDiff parses unified diff shape', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/profiles/packaging/diff');
    return {
      success: true,
      diff: {
        profileCode: 'packaging',
        supported: true,
        draftRevision: 11,
        publishedRevision: 10,
        hasChanges: true,
        items: [
          { path: 'mappings.包装A', kind: 'changed', before: '旧', after: '新' },
        ],
      },
    } as any;
  }) as ApiLike['get'];

  const diff = await mappingConfigApi.loadWorkflowDiff('packaging', '/config/profiles');
  assert.ok(diff);
  assert.equal(diff?.profileCode, 'packaging');
  assert.equal(diff?.items[0].path, 'mappings.包装A');
});

test('mappingConfigApi.loadWorkflowImpact parses unified impact shape', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/profiles/packaging/impact');
    return {
      success: true,
      impact: {
        profileCode: 'packaging',
        supported: true,
        draftRevision: 11,
        publishedRevision: 10,
        hasChanges: true,
        totalChanges: 2,
        counts: { added: 1, removed: 0, changed: 1 },
        topPaths: [
          { path: 'mappings.包装A', kind: 'changed' },
          { path: 'mappings.包装B', kind: 'added' },
        ],
      },
    } as any;
  }) as ApiLike['get'];

  const impact = await mappingConfigApi.loadWorkflowImpact('packaging', '/config/profiles');
  assert.ok(impact);
  assert.equal(impact?.profileCode, 'packaging');
  assert.equal(impact?.totalChanges, 2);
  assert.equal(impact?.topPaths[0].path, 'mappings.包装A');
});

test('mappingConfigApi.loadWorkflowReplay parses unified replay shape', async () => {
  api.get = (async (url: string) => {
    assert.equal(url, '/config/profiles/packaging/replay');
    return {
      success: true,
      replay: {
        profileCode: 'packaging',
        supported: true,
        sampleSource: 'fixtures',
        sampleCount: 4,
        changedSampleCount: 1,
        items: [
          {
            id: 'sample-1',
            label: 'sample-1',
            changed: true,
            before: { counts: { packaging: 1 }, changedSections: ['packaging'] },
            after: { counts: { packaging: 2 }, changedSections: ['packaging'] },
          },
        ],
      },
    } as any;
  }) as ApiLike['get'];

  const replay = await mappingConfigApi.loadWorkflowReplay('packaging', '/config/profiles');
  assert.ok(replay);
  assert.equal(replay?.sampleCount, 4);
  assert.equal(replay?.items[0].label, 'sample-1');
});

test('mappingConfigApi.loadWorkflowReferenceCheck and supplier master parse unified master-check shapes', async () => {
  const calls: string[] = [];
  api.get = (async (url: string) => {
    calls.push(url);
    if (url === '/config/profiles/handle/reference-check') {
      return {
        success: true,
        check: {
          profileCode: 'handle',
          supplierRefs: ['供应商A'],
          materialCodeRefs: ['MAT-1'],
          missingMaterialCodes: ['MAT-1'],
          suppliersMissingInMaterialMaster: ['供应商A'],
          suppliersMissingInSupplierMaster: [],
          hasIssues: true,
        },
      } as any;
    }
    if (url === '/config/masters/suppliers') {
      return {
        success: true,
        items: [
          { supplierName: '供应商A', normalizedName: '供应商a', sources: ['material-master'], materialCount: 1 },
        ],
      } as any;
    }
    throw new Error(`Unexpected GET ${url}`);
  }) as ApiLike['get'];

  const check = await mappingConfigApi.loadWorkflowReferenceCheck('handle', '/config/profiles');
  const suppliers = await mappingConfigApi.loadSupplierMaster();

  assert.deepEqual(calls, ['/config/profiles/handle/reference-check', '/config/masters/suppliers']);
  assert.ok(check?.hasIssues);
  assert.equal(check?.missingMaterialCodes[0], 'MAT-1');
  assert.equal(suppliers[0].supplierName, '供应商A');
});
