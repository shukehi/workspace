import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');

function listSourceFiles(dir: string, acc: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listSourceFiles(filePath, acc);
      continue;
    }
    if (!/\.(vue|ts|js|css)$/.test(entry.name)) continue;
    acc.push(filePath);
  }
  return acc;
}

function toRepoPath(absPath: string): string {
  return path.relative(ROOT, absPath).replaceAll(path.sep, '/');
}

test('legacy guard: src code should not reference removed preview route or localStorage bridge', () => {
  const files = listSourceFiles(SRC_ROOT);
  const blockedPatterns = [
    '/print-preview',
    '_order_preview_',
    'PrintPreview.vue',
  ];
  const hits: string[] = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    blockedPatterns.forEach((pattern) => {
      if (content.includes(pattern)) {
        hits.push(`${toRepoPath(file)} -> ${pattern}`);
      }
    });
  });

  assert.deepEqual(hits, []);
});

test('legacy guard: preview modal should not use iframe based rendering', () => {
  const modalPath = path.join(SRC_ROOT, 'components/procurement/ProcurementPreviewModal.vue');
  const content = fs.readFileSync(modalPath, 'utf8');

  assert.equal(content.includes('<iframe'), false);
  assert.equal(content.includes('previewSrc'), false);
  assert.equal(content.includes('embedded=1'), false);
});
