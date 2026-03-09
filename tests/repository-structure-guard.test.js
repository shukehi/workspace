const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const ROOT = process.cwd();

function gitLsFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();

  return output ? output.split('\n') : [];
}

test('repository structure guard: generated artifacts must stay out of git tracking', () => {
  const trackedFiles = gitLsFiles();
  const blockedEntries = trackedFiles.filter((file) => (
    /^(dist|node_modules|temp)\//.test(file) ||
    /^public\/data\/.+\.json$/.test(file) ||
    /^database\.sqlite(?:-.*)?$/.test(file) ||
    /^data\/runtime\//.test(file) ||
    /^data\/.*\.(sqlite|db)(?:-.*)?$/.test(file)
  ));

  assert.deepEqual(blockedEntries, []);
});

test('repository structure guard: root clutter files must not exist at repository root', () => {
  const blockedRootFiles = [
    'DESIGN_GUIDES.md',
    'Order Inquiry Function Purpose.md',
    'color.csv',
    'packaging-config.png',
    'test_cylinder_logic.js',
  ];

  for (const file of blockedRootFiles) {
    assert.equal(fs.existsSync(`${ROOT}/${file}`), false, `${file} should not live at repository root`);
  }
});
