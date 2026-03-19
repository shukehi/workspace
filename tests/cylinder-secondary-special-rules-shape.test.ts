import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('secondarySpecialRules scan: current production JSON contains self-contained rule variants outside secondaryDimensions', () => {
  const payload = JSON.parse(fs.readFileSync('data/config/cylinder-mapping.json', 'utf8'));
  const secondaryDimensions = new Set(Object.keys(payload.secondaryDimensions || {}).map((item) => String(item).trim()));
  const rules = Array.isArray(payload.secondarySpecialRules) ? payload.secondarySpecialRules : [];

  const outOfDimensionRules = rules.filter((rule: { thickness?: unknown; variants?: unknown }) => {
    const thickness = String(rule?.thickness || '').trim();
    return thickness && !secondaryDimensions.has(thickness);
  });

  assert.ok(rules.length > 0, 'expected at least one secondarySpecialRules entry');
  assert.ok(
    outOfDimensionRules.length > 0,
    'expected at least one rule whose thickness is not defined in secondaryDimensions',
  );

  outOfDimensionRules.forEach((rule: { variants?: unknown }) => {
    const variants = rule?.variants && typeof rule.variants === 'object' ? rule.variants as Record<string, unknown> : {};
    assert.ok(
      Object.keys(variants).length > 0,
      'out-of-dimension secondarySpecialRules should currently rely on self-contained variants',
    );
  });
});
