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
  assert.match(view, /receiptDirectionFilter/);
  assert.match(view, /reverseReasonFilter/);
  assert.match(view, /receiptSummary/);
  assert.match(view, /availableReverseReasonOptions/);
  assert.match(view, /handleExportReceipts/);
  assert.match(view, /refDebounced/);
  assert.match(view, /fetchInventoryReceipts/);
  assert.match(view, /exportReceiptsToCSV/);
  assert.match(view, /loadReceipts/);
  assert.match(view, /入库记录加载失败/);
  assert.match(view, /累计入库数量/);
  assert.match(view, /净入库数量/);
  assert.match(view, /最近入库日期/);
  assert.match(view, /涉及订单数/);
  assert.match(view, /route\.query\.orderNo/);
  assert.match(view, /当前按采购订单/);
  assert.match(view, /全部方向/);
  assert.match(view, /仅入库/);
  assert.match(view, /仅撤销/);
  assert.match(view, /全部原因/);
  assert.match(view, /isReceiptReversible/);
  assert.match(view, /selectedReceiptAudit/);
  assert.match(view, /auditReceiptId/);
  assert.match(view, /SheetContent/);
  assert.match(view, /SheetTitle/);
  assert.match(view, /SheetDescription/);
  assert.match(view, /store\.reverseReceipt/);
  assert.match(view, /PROCUREMENT_REFRESH_SIGNAL_KEY/);
  assert.match(view, /window\.localStorage\.setItem/);
  assert.match(view, /ConfirmDialog/);
  assert.match(view, /确认撤销入库/);
  assert.match(view, /reverseReasonOptions/);
  assert.match(view, /reverseReason/);
  assert.match(view, /reverseRemark/);
  assert.match(view, /reverseQuantity/);
  assert.match(view, /剩余可撤销/);
  assert.match(view, /本次撤销数量/);
  assert.match(view, /全部撤销/);
  assert.match(view, /入库撤销轨迹/);
  assert.match(view, /净入库数量/);
  assert.match(view, /尚无撤销流水/);
  assert.match(view, /跳转采购单/);
  assert.match(view, /撤销成功/);
  assert.match(store, /const receipts = ref/);
  assert.match(store, /const sortedReceipts = computed/);
  assert.match(store, /async function fetchInventoryReceipts/);
  assert.match(store, /async function reverseReceipt/);
  assert.match(store, /function exportReceiptsToCSV/);
  assert.match(store, /方向/);
  assert.match(store, /剩余可撤销/);
  assert.match(store, /receipts\.value = \[\]/);
  assert.match(columns, /header:\s*'入库日期'/);
  assert.match(columns, /header:\s*'订单号'/);
  assert.match(columns, /header:\s*'方向'/);
  assert.match(columns, /header:\s*'操作人'/);
  assert.match(columns, /header:\s*'撤销原因'/);
  assert.match(columns, /header:\s*'剩余可撤销'/);
  assert.match(columns, /轨迹/);
  assert.match(columns, /撤销/);
});
