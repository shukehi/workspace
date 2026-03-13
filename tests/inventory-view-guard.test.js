const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('inventory view guard: shows inventory receipts section with order filter support', () => {
  const view = read('src/views/Inventory.vue');
  const store = read('src/stores/useInventoryStore.ts');
  const columns = read('src/components/inventory/InventoryReceiptColumns.ts');

  assert.match(view, /采购入库记录/);
  assert.match(view, /receiptSearchQuery/);
  assert.match(view, /receiptOrderFilter/);
  assert.match(view, /refDebounced/);
  assert.match(view, /fetchInventoryReceipts/);
  assert.match(view, /loadReceipts/);
  assert.match(view, /入库记录加载失败/);
  assert.match(view, /route\.query\.orderNo/);
  assert.match(view, /当前按采购订单/);
  assert.match(store, /const receipts = ref/);
  assert.match(store, /const sortedReceipts = computed/);
  assert.match(store, /async function fetchInventoryReceipts/);
  assert.match(store, /receipts\.value = \[\]/);
  assert.match(columns, /header:\s*'入库日期'/);
  assert.match(columns, /header:\s*'订单号'/);
  assert.match(columns, /header:\s*'操作人'/);
});
