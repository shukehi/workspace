const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const ROOT = process.cwd();

function read(path) {
  return fs.readFileSync(`${ROOT}/${path}`, 'utf8');
}

test('layout guard: shell components should not define table layout directly', () => {
  const editDialog = read('src/components/procurement/EditOrderDialog.vue');
  const previewModal = read('src/components/procurement/ProcurementPreviewModal.vue');
  const printPreview = read('src/views/PrintPreview.vue');

  assert.match(editDialog, /<OrderSheetView/);
  assert.match(previewModal, /<OrderSheetView/);
  assert.match(printPreview, /<OrderSheetView/);

  assert.equal(editDialog.includes('<table'), false);
  assert.equal(previewModal.includes('<table'), false);
  assert.equal(printPreview.includes('<table'), false);
});

test('layout guard: OrderSheetView remains the single table renderer', () => {
  const orderSheet = read('src/components/procurement/OrderSheetView.vue');
  assert.match(orderSheet, /<table/);
  assert.match(orderSheet, /getSheetSchema/);
  assert.match(orderSheet, /sheetWidthResolver|defaultWidths/);
});
