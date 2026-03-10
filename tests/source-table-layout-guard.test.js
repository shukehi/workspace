const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('source table guard: source page keeps horizontal-scroll hint and min table width', () => {
  const content = read('src/views/Source.vue');

  assert.match(content, /表格可左右滑动查看更多列/);
  assert.match(content, /const sourceTableMinWidth = computed/);
  assert.match(content, /sourceColumns\.reduce/);
  assert.match(content, /:table-min-width="sourceTableMinWidth"/);
  assert.match(content, /:use-column-size="true"/);
});
