const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('print style guard: legacy print.css is not globally imported', () => {
  const mainCss = read('public/css/main.css');
  const printDocCss = read('src/features/procurement/print-document.css');

  assert.equal(mainCss.includes("pages/print.css"), false);
  assert.equal(printDocCss.includes("@import url('/css/pages/print.css');"), false);
});

test('print style guard: print document stylesheet keeps print media rules', () => {
  const printDocCss = read('src/features/procurement/print-document.css');

  assert.match(printDocCss, /@media print/);
  assert.match(printDocCss, /\.controls-bar\s*\{\s*display:\s*none !important;/);
  assert.match(printDocCss, /@page\s*\{\s*size:\s*A4 portrait;/);
});
