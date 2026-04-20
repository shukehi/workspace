import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ROOT = process.cwd()

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8')
}

test('source table guard: source page keeps horizontal-scroll hint and min table width', () => {
  const content = read('src/views/Source.vue')
  const pageState = read('src/features/source-analysis/composables/useSourcePageState.ts')

  assert.match(content, /表格可左右滑动查看更多列/)
  assert.match(pageState, /const sourceTableMinWidth = computed/)
  assert.match(pageState, /sourceColumns\.reduce/)
  assert.match(content, /:table-min-width="sourceTableMinWidth"/)
  assert.doesNotMatch(content, /store\.hasOrder/)
  assert.doesNotMatch(content, /store\.currentOrder/)
  assert.doesNotMatch(content, /store\.orderItems/)
  assert.match(content, /v-if="hasOrder"/)
  assert.match(content, /:data="orderItems"/)
  assert.match(content, /:use-column-size="true"/)
})
