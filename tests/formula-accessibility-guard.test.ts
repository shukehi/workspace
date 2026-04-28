import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('formula page form controls expose stable id and name attributes', () => {
  const layout = read('src/layout/MainLayout.vue');
  const formulaHost = read('src/features/formulas/components/FormulaProfileHost.vue');
  const bomTable = read('src/features/formulas/components/FormulaBomTable.vue');

  assert.match(layout, /id="global-workspace-search"/);
  assert.match(layout, /name="global-workspace-search"/);

  for (const field of [
    'formula-search',
    'formula-status-filter',
    'formula-key',
    'formula-display-name',
    'formula-bom-recommendation-source',
    'formula-change-note',
  ]) {
    assert.match(formulaHost, new RegExp(`id="${field}"`));
    assert.match(formulaHost, new RegExp(`name="${field}"`));
  }

  for (const field of [
    'material-id',
    'position',
    'material-category',
    'supplier',
    'usage-single',
    'usage-double',
    'usage-paired',
  ]) {
    assert.ok(bomTable.includes(`:id="\`formula-bom-\${idx}-${field}\`"`));
    assert.ok(bomTable.includes(`:name="\`formula-bom-\${idx}-${field}\`"`));
  }
});
