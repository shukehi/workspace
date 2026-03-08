const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('secondarySpecialRules scan: current production JSON contains self-contained rule variants outside secondaryDimensions', () => {
  const payload = JSON.parse(fs.readFileSync('public/data/cylinder-mapping.json', 'utf8'));
  const secondaryDimensions = new Set(Object.keys(payload.secondaryDimensions || {}).map((item) => String(item).trim()));
  const rules = Array.isArray(payload.secondarySpecialRules) ? payload.secondarySpecialRules : [];

  const outOfDimensionRules = rules.filter((rule) => {
    const thickness = String(rule?.thickness || '').trim();
    return thickness && !secondaryDimensions.has(thickness);
  });

  assert.ok(rules.length > 0, 'expected at least one secondarySpecialRules entry');
  assert.ok(
    outOfDimensionRules.length > 0,
    'expected at least one rule whose thickness is not defined in secondaryDimensions',
  );

  outOfDimensionRules.forEach((rule) => {
    const variants = rule?.variants && typeof rule.variants === 'object' ? rule.variants : {};
    assert.ok(
      Object.keys(variants).length > 0,
      'out-of-dimension secondarySpecialRules should currently rely on self-contained variants',
    );
  });
});
