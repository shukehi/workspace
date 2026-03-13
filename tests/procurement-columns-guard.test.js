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
  assert.match(content, /header:\s*'交货日期'/);
  assert.doesNotMatch(content, /header:\s*'下单日期'/);
  assert.match(content, /header:\s*'客户名称'/);
  assert.doesNotMatch(content, /header:\s*'金额'/);
  assert.match(content, /metadata\?\.customer_name/);
  assert.doesNotMatch(content, /¥\$\{amount\.toFixed\(2\)\}/);
  assert.ok(customerIndex > -1);
  assert.ok(categoryIndex > -1);
  assert.ok(customerIndex < categoryIndex);
  assert.match(content, /title:\s*'直接打印'/);
  assert.match(content, /actions\.onPrint\(order\)/);
  assert.match(content, /title:\s*'导出 PDF'/);
  assert.match(content, /actions\.onExportPdf\(order\)/);
  assert.match(content, /title:\s*'查看入库记录'/);
  assert.match(content, /actions\.onViewReceipts\(order\)/);
  assert.match(content, /arrived:\s*\{\s*label:\s*'已到货'/);
  assert.match(content, /status !== 'completed'/);
  assert.match(content, /title:\s*'开始采购'/);
  assert.match(content, /actions\.onStatusUpdate\(order,\s*'processing'\)/);
  assert.match(content, /title:\s*'登记到货'/);
  assert.match(content, /actions\.onMarkArrived\(order\)/);
  assert.match(content, /title:\s*'执行入库'/);
  assert.match(content, /actions\.onStockIn\(order\)/);
  assert.match(content, /title:\s*'恢复草稿'/);
  assert.match(content, /actions\.onStatusUpdate\(order,\s*'draft'\)/);
});

test('procurement bulk action guard: supports restoring selected orders to draft', () => {
  const content = read('src/components/procurement/ProcurementBulkActionBar.vue');
  const page = read('src/views/Procurement.vue');

  assert.match(content, /emit\('status',\s*'draft'\)/);
  assert.match(content, /恢复草稿/);
  assert.match(content, /:disabled="!canSubmit"/);
  assert.match(content, /:disabled="!canProcess"/);
  assert.match(content, /:disabled="!canArrive"/);
  assert.match(content, /:disabled="!canStockIn"/);
  assert.match(content, /:disabled="!canRestoreDraft"/);
  assert.match(page, /canBulkSubmit/);
  assert.match(page, /canBulkProcess/);
  assert.match(page, /canBulkArrive/);
  assert.match(page, /canBulkStockIn/);
  assert.match(page, /canBulkRestoreDraft/);
  assert.match(page, /当前所选订单不能批量设为/);
  assert.match(page, /当前所选订单不能批量登记到货/);
  assert.match(page, /当前所选订单不能批量执行入库/);
  assert.match(page, /批量到货部分完成/);
  assert.match(page, /批量入库部分完成/);
});

test('procurement filter guard: supports risk and manual-review filters', () => {
  const filterBar = read('src/components/procurement/ProcurementFilterBar.vue');
  const page = read('src/views/Procurement.vue');
  const state = read('src/features/procurement/useProcurementPageState.ts');

  assert.match(filterBar, /update:activeStatus/);
  assert.match(page, /v-model:active-status/);
  assert.match(page, /route\.query\.orderNo/);
  assert.match(page, /syncSearchQueryFromRoute/);
  assert.match(page, /当前按订单号/);
  assert.match(state, /activeStatus/);
  assert.match(state, /全部订单/);
  assert.match(state, /已提交/);
  assert.match(state, /已到货/);
  assert.match(state, /已入库/);
  assert.match(state, /PENDING/);
  assert.match(filterBar, /update:activeRiskFilter/);
  assert.match(page, /v-model:active-risk-filter/);
  assert.match(state, /activeRiskFilter/);
  assert.match(state, /matchesOrderRiskFilter/);
  assert.match(state, /风险订单/);
  assert.match(state, /待人工处理/);
});

test('procurement preview guard: arrived and completed orders cannot edit from preview', () => {
  const modal = read('src/components/procurement/ProcurementPreviewModal.vue');
  const page = read('src/views/Procurement.vue');
  const dialogs = read('src/features/procurement/useProcurementDialogs.ts');
  const editDialog = read('src/components/procurement/EditOrderDialog.vue');
  const orderSheet = read('src/components/procurement/OrderSheetView.vue');

  assert.match(modal, /canEdit\?: boolean/);
  assert.match(modal, /v-if="canEdit"/);
  assert.match(page, /:can-edit="canEditOrder\(previewOrder\)"/);
  assert.match(dialogs, /function canEditOrder/);
  assert.match(dialogs, /function notifyEditLocked/);
  assert.match(dialogs, /return !!order && order.status !== 'completed'/);
  assert.match(editDialog, /isRestrictedDetailEdit/);
  assert.match(editDialog, /已到货订单仅允许修改交货日期和整单备注/);
  assert.match(editDialog, /remark: draft\.remark/);
  assert.match(editDialog, /delivery_date: draft\.delivery_date/);
  assert.match(orderSheet, /restrictDetailEditing\?: boolean/);
  assert.match(orderSheet, /isRestrictedEditMode/);
});
