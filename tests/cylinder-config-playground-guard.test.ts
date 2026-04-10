import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

test('cylinder config exposes accessory rule explain playground', () => {
  const view = read('src/views/CylinderConfig.vue');
  const composable = read('src/features/config-editor/composables/useRuleExplainPreview.ts');

  assert.match(view, /useRuleExplainPreview/);
  assert.match(view, /adaptCylinderAccessoryPackRulesToRuleSet/);
  assert.match(view, /CardTitle>规则试跑</);
  assert.match(view, /命中轨迹/);
  assert.match(view, /最终输出/);
  assert.match(view, /副锁护罩 \(fshz\)/);
  assert.match(view, /主锁护罩 \(sxhz\)/);
  assert.match(view, /门厚/);
  assert.match(view, /总数量/);
  assert.match(view, /accessoryExplain\.matchedCount/);
  assert.match(view, /accessoryExplain\.result\.value\.winningRules/);
  assert.match(view, /JSON\.stringify\(accessoryExplain\.result\.value\.output, null, 2\)/);

  assert.match(composable, /export function useRuleExplainPreview/);
  assert.match(composable, /explainRuleSet/);
});
