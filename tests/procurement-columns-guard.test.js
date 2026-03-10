const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('procurement columns guard: detail table shows customer name instead of amount', () => {
  const content = read('src/components/procurement/ProcurementColumns.ts');
  const customerIndex = content.indexOf("header: '客户名称'");
  const categoryIndex = content.indexOf("header: '类别'");

  assert.match(content, /header:\s*'制单日期'/);
  assert.doesNotMatch(content, /header:\s*'下单日期'/);
  assert.match(content, /header:\s*'客户名称'/);
  assert.doesNotMatch(content, /header:\s*'金额'/);
  assert.match(content, /metadata\?\.customer_name/);
  assert.doesNotMatch(content, /¥\$\{amount\.toFixed\(2\)\}/);
  assert.ok(customerIndex > -1);
  assert.ok(categoryIndex > -1);
  assert.ok(customerIndex < categoryIndex);
  assert.match(content, /title:\s*'恢复草稿'/);
  assert.match(content, /actions\.onStatusUpdate\(order,\s*'draft'\)/);
});

test('procurement bulk action guard: supports restoring selected orders to draft', () => {
  const content = read('src/components/procurement/ProcurementBulkActionBar.vue');
  const page = read('src/views/Procurement.vue');

  assert.match(content, /emit\('status',\s*'draft'\)/);
  assert.match(content, /恢复草稿/);
  assert.match(content, /:disabled="!canSubmit"/);
  assert.match(content, /:disabled="!canComplete"/);
  assert.match(content, /:disabled="!canRestoreDraft"/);
  assert.match(page, /canBulkSubmit/);
  assert.match(page, /canBulkComplete/);
  assert.match(page, /canBulkRestoreDraft/);
  assert.match(page, /当前所选订单不能批量设为/);
});
