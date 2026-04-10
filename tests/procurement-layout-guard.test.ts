import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const ROOT = process.cwd()

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8')
}

test('layout guard: edit and preview shells should share OrderSheet renderer', () => {
  const editDialog = read('src/components/procurement/EditOrderDialog.vue')
  const previewModal = read('src/components/procurement/ProcurementPreviewModal.vue')
  const printDocument = read('src/views/PrintDocument.vue')

  assert.match(editDialog, /<OrderSheetView/)
  assert.match(editDialog, /aggregateSideQuantities/)
  assert.match(editDialog, /分左右数量/)
  assert.match(editDialog, /总数量/)
  assert.match(editDialog, /人工取消 ! 警告/)
  assert.match(editDialog, /恢复 ! 警告/)
  assert.match(editDialog, /riskWarningDismissed/)
  assert.match(editDialog, /metadata\.aggregateSideQuantities = false/)
  assert.match(editDialog, /metadata\.aggregateSideQuantities = aggregateSideQuantities\.value/)
  assert.match(editDialog, /PROCUREMENT_TEMPLATE_OPTIONS/)
  assert.match(editDialog, /resolveTemplateCategories/)
  assert.match(editDialog, /resolvePrimaryCategoryForTemplate/)
  assert.match(editDialog, /createEmptyOrderDraftByTemplate/)
  assert.match(editDialog, /form\.value\.category = category[\s\S]*form\.value\.metadata\.template_type = templateType[\s\S]*aggregateSideQuantities\.value = false/)
  assert.match(editDialog, /handleTemplateChange/)
  assert.match(editDialog, /handleBusinessCategoryChange/)
  assert.match(editDialog, /requiresBusinessCategoryChoice/)
  assert.match(editDialog, /currentTemplateCategoryOptions/)
  assert.match(editDialog, /<option v-for="option in PROCUREMENT_TEMPLATE_OPTIONS"/)
  assert.match(editDialog, /<option v-for="option in currentTemplateCategoryOptions"/)
  assert.match(editDialog, /class="absolute left-0\.5 top-0\.5 h-5 w-5 rounded-full bg-white shadow transition-transform"/)
  assert.match(editDialog, /aggregateSideQuantities \? 'translate-x-5' : 'translate-x-0'/)
  assert.match(previewModal, /<OrderSheetView/)
  assert.match(previewModal, /mode="preview"/)
  assert.match(previewModal, /aggregate-side-quantities="Boolean\(order\.metadata\?\.aggregateSideQuantities\)"/)
  assert.match(printDocument, /<OrderSheetView/)
  assert.match(printDocument, /mode="preview"/)
  assert.match(printDocument, /aggregate-side-quantities="Boolean\(source\.order\.metadata\?\.aggregateSideQuantities\)"/)
  assert.doesNotMatch(previewModal, /customer-name-display=/)
  assert.match(printDocument, /customer-name-display="salesDepartment"/)
  assert.doesNotMatch(printDocument, /route\.query\.pdf === '1' \? 'salesDepartment' : 'full'/)
  assert.match(printDocument, /addEventListener\('afterprint', closeAutoPrintWindow\)/)
  assert.match(printDocument, /window\.close\(\)/)
  assert.match(printDocument, /print-document\.css/)

  assert.equal(editDialog.includes('<table'), false)
  assert.equal(previewModal.includes('<table'), false)
  assert.equal(printDocument.includes('<table'), false)
  assert.equal(previewModal.includes('<iframe'), false)
  assert.equal(previewModal.includes('embedded=1'), false)
  assert.equal(printDocument.includes('<iframe'), false)
})

test('layout guard: shared order sheet owns procurement table markup', () => {
  const printDocument = read('src/views/PrintDocument.vue')
  assert.match(printDocument, /controls-bar/)
  assert.match(printDocument, /print-document-shell/)
  assert.match(printDocument, /id="printDocumentOutput"/)
  assert.match(printDocument, /printMode/)
  assert.match(printDocument, /resolveSheetWidths/)

  const orderSheet = read('src/components/procurement/OrderSheetView.vue')
  assert.match(orderSheet, /<table/)
  assert.match(orderSheet, /getSheetSchema/)
  assert.match(orderSheet, /sheetWidthResolver|defaultWidths/)
  assert.match(orderSheet, /resolveAggregateQuantityDisplayWidth/)
  assert.match(orderSheet, /resolveAggregateRemarkColumnWidth/)
  assert.match(orderSheet, /quantity: width/)
})
