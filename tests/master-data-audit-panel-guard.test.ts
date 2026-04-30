import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MASTER_DATA_COMPONENTS_DIR = path.join(ROOT, 'src/features/master-data/components');

function read(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf8');
}

function readComponent(fileName: string): string {
  return fs.readFileSync(path.join(MASTER_DATA_COMPONENTS_DIR, fileName), 'utf8');
}

function componentImports(source: string): string[] {
  return Array.from(source.matchAll(/from ['"](?:@\/features\/master-data\/components\/|\.\/)([^'"]+\.vue)['"]/g))
    .map((match) => path.basename(match[1]));
}

function collectLocalComponentSource(entryFileName: string, visited = new Set<string>()): string {
  if (visited.has(entryFileName)) {
    return '';
  }

  visited.add(entryFileName);
  const source = readComponent(entryFileName);
  const importedSource = componentImports(source)
    .map((importedFileName) => collectLocalComponentSource(importedFileName, visited))
    .join('\n');

  return `${source}\n${importedSource}`;
}

function hasCallerOwnedLimit(source: string, limit: number): boolean {
  const numericLimit = String(limit);
  const propLimitPattern = new RegExp(
    `(?:[:\\w-]*(?:limit|max-items|max-rows|row-limit|visible-count|items-limit)=["']${numericLimit}["']|` +
      `[:\\w-]*(?:limit|max-items|max-rows|row-limit|visible-count|items-limit)=["']\\{?${numericLimit}\\}?["'])`,
  );

  return new RegExp(`auditLogs\\.slice\\(0,\\s*${numericLimit}\\)`).test(source) || propLimitPattern.test(source);
}

test('master data audit panels keep audit list labels and caller-owned row limits', () => {
  const materialPanel = readComponent('MaterialAuditPanel.vue');
  const supplierPanel = readComponent('SupplierAuditPanel.vue');
  const auditLogList = readComponent('MasterDataAuditLogList.vue');
  const materialPanelWithImports = collectLocalComponentSource('MaterialAuditPanel.vue');
  const supplierPanelWithImports = collectLocalComponentSource('SupplierAuditPanel.vue');

  assert.ok(
    componentImports(materialPanel).includes('MasterDataAuditLogList.vue'),
    'material audit panel should consume the shared audit-log list extraction',
  );
  assert.ok(
    componentImports(supplierPanel).includes('MasterDataAuditLogList.vue'),
    'supplier audit panel should consume the shared audit-log list extraction',
  );
  assert.match(auditLogList, /v-for="log in auditLogs"/, 'shared audit-log list should own audit row rendering');

  assert.match(materialPanelWithImports, /最近审计记录/, 'material audit panel should still render the recent audit title');
  assert.match(supplierPanelWithImports, /最近审计记录/, 'supplier audit panel should still render the recent audit title');

  assert.ok(hasCallerOwnedLimit(materialPanel, 10), 'material audit panel should own the 10-row audit list limit');
  assert.ok(hasCallerOwnedLimit(supplierPanel, 5), 'supplier audit panel should own the 5-row audit list limit');
});

test('supplier audit trend strip stays in supplier panel instead of the shared audit list', () => {
  const supplierPanel = readComponent('SupplierAuditPanel.vue');

  assert.match(supplierPanel, /最近 5 条变更/);
  assert.match(supplierPanel, /auditTrendSummary\.createCount/);
  assert.match(supplierPanel, /auditTrendSummary\.updateCount/);
  assert.match(supplierPanel, /auditTrendSummary\.archiveCount/);
  assert.match(supplierPanel, /auditTrendSummary\.latestCreatedAt/);
});

test('master data audit list extraction stays presentational and out of summary or diagnostics panels', () => {
  const componentFileNames = fs.readdirSync(MASTER_DATA_COMPONENTS_DIR).filter((fileName) => fileName.endsWith('.vue'));
  const auditListFileNames = componentFileNames.filter((fileName) => /^MasterDataAuditLog.*\.vue$/.test(fileName));

  for (const fileName of auditListFileNames) {
    const source = readComponent(fileName);

    assert.doesNotMatch(source, /auditTrendSummary/, `${fileName} should not own supplier trend summary rendering`);
    assert.doesNotMatch(source, /from ['"].*(?:api|composables|router)/, `${fileName} should remain presentational`);
    assert.doesNotMatch(source, /\b(?:fetch|axios)\s*\(/, `${fileName} should not perform runtime data fetching`);
  }

  const summaryOrDiagnosticsFiles = componentFileNames.filter((fileName) => (
    /Summary|Diagnostics/.test(fileName)
  ));

  for (const fileName of summaryOrDiagnosticsFiles) {
    const source = read(`src/features/master-data/components/${fileName}`);

    assert.doesNotMatch(source, /MasterDataAuditLog/, `${fileName} should not consume the audit list extraction`);
    assert.doesNotMatch(source, /最近审计记录/, `${fileName} should not gain audit-list markup`);
  }
});
