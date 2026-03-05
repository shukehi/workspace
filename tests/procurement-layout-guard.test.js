const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('layout guard: edit and preview shells should share OrderSheet renderer', () => {
  const editDialog = read('src/components/procurement/EditOrderDialog.vue');
  const previewModal = read('src/components/procurement/ProcurementPreviewModal.vue');
  const printDocument = read('src/views/PrintDocument.vue');

  assert.match(editDialog, /<OrderSheetView/);
  assert.match(previewModal, /<OrderSheetView/);
  assert.match(previewModal, /mode=\"preview\"/);
  assert.match(printDocument, /<table/);

  assert.equal(editDialog.includes('<table'), false);
  assert.equal(previewModal.includes('<table'), false);
  assert.equal(previewModal.includes('<iframe'), false);
  assert.equal(previewModal.includes('embedded=1'), false);
});

test('layout guard: dedicated print renderer owns print table markup', () => {
  const printDocument = read('src/views/PrintDocument.vue');
  assert.match(printDocument, /buildProcurementDocModel/);
  assert.match(printDocument, /class=\"print-table\"/);

  const orderSheet = read('src/components/procurement/OrderSheetView.vue');
  assert.match(orderSheet, /<table/);
  assert.match(orderSheet, /getSheetSchema/);
  assert.match(orderSheet, /sheetWidthResolver|defaultWidths/);
});
