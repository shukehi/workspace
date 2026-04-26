import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ROOT = process.cwd()

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8')
}

test('print style guard: legacy print.css is not globally imported', () => {
  const mainCss = read('public/css/main.css')
  const printDocCss = read('src/features/procurement/print-document.css')

  assert.equal(mainCss.includes("pages/print.css"), false)
  assert.equal(printDocCss.includes("@import url('/css/pages/print.css');"), false)
})

test('print style guard: print document stylesheet keeps print media rules', () => {
  const printDocCss = read('src/features/procurement/print-document.css')

  assert.match(printDocCss, /@media print/)
  assert.match(printDocCss, /\.controls-bar\s*\{\s*display:\s*none !important;/)
  assert.match(printDocCss, /@page\s*\{\s*size:\s*A4 portrait;/)
})

test('print style guard: order sheet scroll wrapper does not clip printed tables', () => {
  const printDocCss = read('src/features/procurement/print-document.css')

  assert.match(printDocCss, /\.order-sheet \.order-sheet-table-wrapper\s*\{\s*overflow:\s*visible !important;/)
  assert.doesNotMatch(printDocCss, /\.order-sheet \.border\.rounded-lg\.overflow-hidden\s*\{/)
})
