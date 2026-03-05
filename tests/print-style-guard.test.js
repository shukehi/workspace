const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('print style guard: legacy print.css is not globally imported', () => {
  const mainCss = read('public/css/main.css');
  const printPreview = read('src/views/PrintPreview.vue');

  assert.equal(mainCss.includes("pages/print.css"), false);
  assert.equal(printPreview.includes("@import url('/css/pages/print.css');"), false);
});

test('print style guard: PrintPreview keeps local print media rules', () => {
  const printPreview = read('src/views/PrintPreview.vue');

  assert.match(printPreview, /@media print/);
  assert.match(printPreview, /\.controls-bar\s*\{\s*display:\s*none !important;/);
  assert.match(printPreview, /@page\s*\{\s*size:\s*A4 portrait;/);
});
