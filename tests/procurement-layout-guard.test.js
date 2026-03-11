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
  assert.match(printDocument, /<OrderSheetView/);
  assert.match(printDocument, /mode=\"preview\"/);
  assert.doesNotMatch(previewModal, /customer-name-display=/);
  assert.match(printDocument, /route\.query\.pdf === '1' \? 'salesDepartment' : 'full'/);
  assert.match(printDocument, /:customer-name-display=\"customerNameDisplay\"/);
  assert.match(printDocument, /addEventListener\('afterprint', closeAutoPrintWindow\)/);
  assert.match(printDocument, /window\.close\(\)/);
  assert.match(printDocument, /print-document\.css/);

  assert.equal(editDialog.includes('<table'), false);
  assert.equal(previewModal.includes('<table'), false);
  assert.equal(printDocument.includes('<table'), false);
  assert.equal(previewModal.includes('<iframe'), false);
  assert.equal(previewModal.includes('embedded=1'), false);
  assert.equal(printDocument.includes('<iframe'), false);
});

test('layout guard: shared order sheet owns procurement table markup', () => {
  const printDocument = read('src/views/PrintDocument.vue');
  assert.match(printDocument, /controls-bar/);
  assert.match(printDocument, /print-document-shell/);
  assert.match(printDocument, /printMode/);
  assert.match(printDocument, /resolveSheetWidths/);

  const orderSheet = read('src/components/procurement/OrderSheetView.vue');
  assert.match(orderSheet, /<table/);
  assert.match(orderSheet, /getSheetSchema/);
  assert.match(orderSheet, /sheetWidthResolver|defaultWidths/);
});
