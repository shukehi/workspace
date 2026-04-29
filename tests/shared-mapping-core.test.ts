import test from 'node:test'
import assert from 'node:assert/strict'
import {
  defaults,
  adaptPackagingMapping,
  adaptCylinderMapping,
  adaptLockForkMapping,
  adaptLockMapping,
} from '../shared/mappings/mapping-adapter-core'
import {
  validatePackagingMapping,
  validateCylinderMapping,
  validateLockMapping,
  validateLockForkMapping,
} from '../shared/mappings/mapping-validator-core'

test('shared mapping adapter core: packaging canonicalizes legacy dictionary shape', () => {
  const payload = adaptPackagingMapping({
    包装A: '外协包装A',
  })

  assert.deepEqual(payload, {
    supplierName: '方亮包装',
    mappings: { 包装A: '外协包装A' },
  })
})

test('shared mapping validator core: packaging exposes normalized conflict path', () => {
  const issues = validatePackagingMapping({
    supplierName: '方亮包装',
    mappings: {
      'A B': '外协A',
      AB: '外协B',
    },
  })

  assert.ok(
    issues.some((item: { path: string; code: string }) => item.path === 'mappings["AB"]' && item.code === 'normalized-conflict')
  )
})

test('shared mapping core: cylinder adapter defaults and validator nested paths stay stable', () => {
  const adapted = adaptCylinderMapping({
    dimensions: {
      7: { code: '90AB', eccentricity: '34.5*55.5' },
    },
  })
  const issues = validateCylinderMapping({
    specialRules: [
      {
        conditionField: '',
        keyword: '',
        thickness: '9',
        variants: {
          内开: { code: '', eccentricity: '' },
        },
      },
    ],
    mappings: {
      锁芯A: { supplier: '', template: '' },
    },
  })

  assert.equal((adapted.dimensions as Record<string, any>)['7'].code, '90AB')
  assert.ok(issues.some((item: { path: string }) => item.path === 'specialRules[0].conditionField'))
  assert.ok(issues.some((item: { path: string }) => item.path === 'specialRules[0].variants["内开"].code'))
  assert.ok(issues.some((item: { path: string }) => item.path === 'mappings["锁芯A"].supplier'))
})

test('shared mapping core: cylinder exclusions preserve explicit empty lists across module formats', async () => {
  const mjsCore = await import('../shared/mappings/mapping-adapter-core.mjs') as any
  const missingCjs = adaptCylinderMapping({}) as any
  const emptyCjs = adaptCylinderMapping({ excludedCylinders: [] }) as any
  const missingMjs = mjsCore.adaptCylinderMapping({}) as any
  const emptyMjs = mjsCore.adaptCylinderMapping({ excludedCylinders: [] }) as any

  assert.deepEqual(missingCjs.excludedCylinders, ['指纹锁配套锁芯'])
  assert.deepEqual(missingMjs.excludedCylinders, ['指纹锁配套锁芯'])
  assert.deepEqual(emptyCjs.excludedCylinders, [])
  assert.deepEqual(emptyMjs.excludedCylinders, [])
})

test('shared mapping core: handle ownership defaults are exported from the shared boundary', () => {
  assert.equal((defaults as any).DEFAULT_HANDLE_SUPPLIER, '拉手供应商');
  assert.equal((defaults as any).DEFAULT_HANDLE_UNMATCHED_SUPPLIER, '待人工处理');
  assert.equal((defaults as any).DEFAULT_HANDLE_MANUAL_REVIEW_LABEL, '未匹配拉手(待人工处理)');
});

test('shared mapping core: lock defaults normalize missing and empty ownership fields', () => {
  const adapted = adaptLockMapping({
    defaultUnit: ' ',
    primaryLabel: '',
    mappings: {},
  }) as any;

  assert.equal(adapted.defaultUnit, '套');
  assert.equal(adapted.primaryLabel, '主锁');
  assert.equal(adapted.secondaryLabel, '副锁');
});

test('shared mapping core: lock and lock-fork validator paths remain compatible', () => {
  const lockIssues = validateLockMapping({
    mappings: {
      'SD-9030（6607大锁）': { supplier: '汇成', vendorName: '6607大锁' },
      'SD-9030 ( 6607大锁 )': { supplier: '汇成', vendorName: '重复锁具' },
    },
  })
  const lockForkAdapted = adaptLockForkMapping({
    suppliers: { default: '应志友' },
    highHeightRules: {
      7: {
        minHeight: 2200,
        heightReference: 2200,
        standard: {
          upper: { base1: 570, base2: 376 },
          lower: { base1: 570, base2: 376 },
        },
      },
    },
  })
  const lockForkIssues = validateLockForkMapping({
    highHeightRules: {
      7: {
        minHeight: 'oops',
        heightReference: '',
        standard: {
          upper: { base1: 570, base2: 'x' },
          lower: { base1: 'y', base2: 376 },
        },
      },
    },
    suppliers: { default: '应志友' },
  })

  assert.equal(lockForkAdapted.hangingFeet.standard, 35)
  assert.ok(
    lockIssues.some((item: { path: string; code: string }) => item.path === 'mappings["SD-9030 ( 6607大锁 )"]' && item.code === 'normalized-conflict')
  )
  assert.ok(lockForkIssues.some((item: { path: string }) => item.path === 'highHeightRules["7"].minHeight'))
  assert.ok(lockForkIssues.some((item: { path: string }) => item.path === 'highHeightRules["7"].standard.upper.base2'))
})
