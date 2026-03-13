const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('procurement columns guard: detail table shows customer name instead of amount', () => {
  const content = read('src/components/procurement/ProcurementColumns.ts');
  const stockInEligibility = read('src/features/procurement/stockInEligibility.ts');
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
  assert.match(content, /const canStockIn = status === 'arrived' && hasRemainingStockInItems\(order\)/);
  assert.match(content, /title:\s*'恢复草稿'/);
  assert.match(content, /actions\.onStatusUpdate\(order,\s*'draft'\)/);
  assert.match(stockInEligibility, /export function hasRemainingStockInItems/);
  assert.match(stockInEligibility, /resolveOrderedQuantity/);
  assert.match(stockInEligibility, /if \(ordered > 0\) return ordered/);
  assert.match(stockInEligibility, /return ordered - received > 0/);
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
  assert.match(page, /批量到货部分完成/);
  assert.match(page, /hasRemainingStockInItems/);
  assert.match(page, /order\.status === 'arrived' && hasRemainingStockInItems\(order\)/);
  assert.match(page, /openStockInQueue/);
  assert.match(page, /批量入库已中止/);
});

test('procurement filter guard: supports risk and manual-review filters', () => {
  const filterBar = read('src/components/procurement/ProcurementFilterBar.vue');
  const page = read('src/views/Procurement.vue');
  const state = read('src/features/procurement/useProcurementPageState.ts');

  assert.match(filterBar, /update:activeStatus/);
  assert.match(page, /v-model:active-status/);
  assert.match(page, /route\.query\.orderNo/);
  assert.match(page, /route\.query\.page/);
  assert.match(page, /route\.query\.pageSize/);
  assert.match(page, /updateProcurementRouteQuery/);
  assert.match(page, /loadProcurementOrders/);
  assert.match(page, /buildProcurementQuery/);
  assert.match(page, /syncSearchQueryFromRoute/);
  assert.match(page, /syncProcurementFiltersFromRoute/);
  assert.match(page, /refDebounced/);
  assert.match(page, /PROCUREMENT_REFRESH_SIGNAL_KEY/);
  assert.match(page, /window\.addEventListener\('storage', handleProcurementRefreshSignal\)/);
  assert.match(page, /window\.removeEventListener\('storage', handleProcurementRefreshSignal\)/);
  assert.match(page, /function handleProcurementRefreshSignal/);
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
  assert.match(state, /serverPaginationEnabled/);
  assert.match(state, /facetCounts/);
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

test('procurement stock-in guard: arrived orders use detail stock-in dialog', () => {
  const page = read('src/views/Procurement.vue');
  const dialog = read('src/components/procurement/ProcurementStockInDialog.vue');
  const table = read('src/components/data-table/DataTable.vue');

  assert.match(page, /import ProcurementStockInDialog/);
  assert.match(page, /import \{ hasRemainingStockInItems \} from '@\/features\/procurement\/stockInEligibility'/);
  assert.match(page, /const stockInOrder = ref<Order \| null>\(null\)/);
  assert.match(page, /const stockInDialogOpen = ref\(false\)/);
  assert.match(page, /const stockInSaving = ref\(false\)/);
  assert.match(page, /const stockInQueue = ref<Order\[\]>\(\[\]\)/);
  assert.match(page, /const stockInQueueIndex = ref\(0\)/);
  assert.match(page, /const openStockInDialog = \(order: Order\)/);
  assert.match(page, /const openStockInQueue = \(orders: Order\[\]\)/);
  assert.match(page, /handleStockInDialogOpenChange/);
  assert.match(page, /if \(!hasRemainingStockInItems\(order\)\)/);
  assert.match(page, /当前订单没有可继续入库的明细/);
  assert.match(page, /onStockIn: openStockInDialog/);
  assert.match(page, /<ProcurementStockInDialog/);
  assert.match(page, /:manual-pagination="store.serverPaginationEnabled"/);
  assert.match(page, /:page="store.ordersPage"/);
  assert.match(page, /:page-size="store.ordersPageSize"/);
  assert.match(page, /:total="store.ordersTotal"/);
  assert.match(page, /:page-size-options="\[20, 50, 100\]"/);
  assert.match(page, /@page-change="procurementPage = \$event"/);
  assert.match(page, /@page-size-change="procurementPageSize = \$event"/);
  assert.match(page, /await store\.fetchAllOrders\(buildProcurementQuery\(\)\)/);
  assert.match(page, /:queue-index="stockInQueueIndex \+ 1"/);
  assert.match(page, /:queue-total="stockInQueue.length \|\| 1"/);
  assert.match(page, /title: isCompleted \? '入库完成，进入下一单' : '部分入库成功，进入下一单'/);
  assert.match(page, /title: queueActive/);
  assert.match(page, /'批量入库流程已完成'/);
  assert.match(page, /'批量入库已完成'/);
  assert.match(page, /张已完成入库，\$\{pendingCount\} 张仍有明细待入库/);
  assert.match(table, /table\.resetRowSelection\(\)/);
  assert.match(table, /emit\('selection-change', \[\]\)/);
  assert.match(dialog, /订单级“入库日期”只会在全部明细完成入库后写入/);
  assert.match(dialog, /批量入库第/);
  assert.match(dialog, /item_key/);
  assert.match(dialog, /remaining/);
  assert.match(dialog, /全入/);
  assert.match(dialog, /quantity: ''/);
});
