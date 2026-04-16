import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

function rgFiles(pattern: string, roots: string[] = ['src']): string[] {
  try {
    const output = execFileSync('rg', ['-l', pattern, ...roots], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    return output ? output.split('\n') : [];
  } catch (error) {
    if ((error as { status?: number }).status === 1) return [];
    throw error;
  }
}

test('governance guard: PR template keeps boundary prompts', () => {
  const template = read('.github/pull_request_template.md');
  const requiredSnippets = [
    'Related roadmap / governance doc:',
    'Request validation impact: `Yes/No`',
    'Browser/runtime side-effect boundary touched: `Yes/No`',
    'Legacy / compatibility entry touched: `Yes/No`',
    'Legacy / compatibility retirement plan:',
    'Request validation / error response shape verified for affected write APIs',
    'Added or updated guard / structure test when introducing new boundary rules',
    'Browser-side effects (`confirm/prompt/open/localStorage/download/onbeforeunload`) were not pushed deeper into core store / manager layers',
    'Affected write APIs have a clear request validation boundary; no new raw request passthrough added',
    'Error response shape remains consistent for touched endpoints, or the contract delta is explicitly documented',
  ];

  for (const snippet of requiredSnippets) {
    assert.notEqual(
      template.indexOf(snippet),
      -1,
      `PR template is missing required governance prompt: ${snippet}`,
    );
  }
});

test('governance guard: PR checklist keeps core review questions', () => {
  const checklist = read('docs/governance/PR_FEATURE_CHECKLIST_2026-03-10.md');
  const requiredSnippets = [
    '浏览器副作用是否没有继续直接堆进核心 store / manager',
    '新增或改造的写接口是否有明确请求校验落点',
    '错误结构是否保持 `code/message/details` 语义稳定',
    '兼容壳文件是否只保留转发，不承载新逻辑',
    '如果新增了请求校验、legacy 退场规则或 runtime adapter，是否补了对应测试',
  ];

  for (const snippet of requiredSnippets) {
    assert.notEqual(
      checklist.indexOf(snippet),
      -1,
      `PR checklist is missing required governance prompt: ${snippet}`,
    );
  }
});

test('governance guard: prompt and window lifecycle side-effects stay inside the reviewed allowlist', () => {
  // Freeze current debt while browser-side-effect refactor continues.
  // Updated 2026-03-18: window.confirm moved from Procurement.vue into useOrderActions composable.
  assert.deepEqual(
    rgFiles('window\\.(confirm|prompt|open|onbeforeunload)', ['src']).sort(),
    [
      'src/components/procurement/EditOrderDialog.vue',
      'src/components/source/ContractHistoryDialog.vue',
      'src/features/formulas/composables/useDirtyBeforeUnload.ts',
      'src/features/formulas/composables/useFormulaManager.ts',
      'src/features/procurement/composables/useOrderActions.ts',
      'src/views/PrintDocument.vue',
    ],
  );
});

test('governance guard: localStorage access stays inside the reviewed allowlist', () => {
  assert.deepEqual(
    rgFiles('(window\\.)?localStorage', ['src']).sort(),
    [
      'src/features/procurement/sheetWidthResolver.ts',
      'src/features/source-analysis/services/sourceOrderSnapshot.ts',
      'src/views/Inventory.vue',
    ],
  );
});

test('governance guard: download anchor creation stays inside the reviewed allowlist', () => {
  assert.deepEqual(
    rgFiles('document\\.createElement\\([\'"]a[\'"]\\)', ['src']).sort(),
    [
      'src/features/inventory/inventoryCsvExports.ts',
      'src/lib/api.ts',
      'src/stores/useProcurementStore.ts',
    ],
  );
});

test('governance guard: compatibility shell files stay inside the reviewed allowlist', () => {
  // OrderService.ts, InventoryReceiptService.ts, FormulaService.ts all retired 2026-03-18.
  // No top-level service files use `module.exports = require(` pattern anymore.
  assert.deepEqual(
    rgFiles('^module\\.exports = require\\(', ['server/services']).sort(),
    [],
  );
});

test('governance guard: top-level compatibility shell files have been fully retired', () => {
  const retiredShells = [
    'server/services/OrderService.ts',
    'server/services/InventoryReceiptService.ts',
    'server/services/FormulaService.ts',
  ];
  for (const shellPath of retiredShells) {
    assert.ok(
      !fs.existsSync(path.join(ROOT, shellPath)),
      `Compatibility shell should be gone but still exists: ${shellPath}`,
    );
  }
});
