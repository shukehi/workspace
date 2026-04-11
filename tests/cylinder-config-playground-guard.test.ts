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
  const component = read('src/features/config-editor/components/RuleExplainPlayground.vue');

  assert.match(view, /useRuleExplainPreview/);
  assert.match(view, /adaptCylinderAccessoryPackRulesToRuleSet/);
  assert.match(view, /RuleExplainPlayground/);
  assert.match(view, /title="规则试跑"/);
  assert.match(view, /accessoryExplainFields/);
  assert.match(view, /副锁护罩 \(fshz\)/);
  assert.match(view, /主锁护罩 \(sxhz\)/);
  assert.match(view, /门厚/);
  assert.match(view, /总数量/);

  assert.match(composable, /export function useRuleExplainPreview/);
  assert.match(composable, /explainRuleSet/);
  assert.match(composable, /export interface RuleExplainPreviewHandle/);
  assert.match(component, /命中轨迹/);
  assert.match(component, /最终输出/);
  assert.match(component, /preview\.matchedCount/);
  assert.match(component, /preview\.result\.value\.winningRules/);
  assert.match(component, /JSON\.stringify\(preview\.result\.value\.output, null, 2\)/);
});
