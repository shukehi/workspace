import test from 'node:test';
import assert from 'node:assert/strict';
import { getDefaultWidths, sanitizeWidths, resolveInitialWidths, resolveSheetWidths } from '../src/features/procurement/sheetWidthResolver';

test('sheet width defaults: returns category specific config', () => {
  const packaging = getDefaultWidths('packaging');
  const lock = getDefaultWidths('lock');

  assert.equal(packaging.productModelName, 220);
  assert.equal(lock.unit, 70);
  assert.equal(lock.type, 220);
});

test('sanitizeWidths: keeps defaults and applies valid custom values', () => {
  const defaults = getDefaultWidths('cylinder');
  const merged = sanitizeWidths({ type: 300, quantity: 20, remark: 210 }, defaults);

  assert.equal(merged.type, 300);
  assert.equal(merged.remark, 210);
  // 20 is below min threshold and should fallback to default
  assert.equal(merged.quantity, defaults.quantity);
});

test('resolveInitialWidths: uses metadata widths when provided', () => {
  const resolved = resolveInitialWidths('锁叉', { type: 280, quantity: 120 });

  assert.equal(resolved.category, 'lock');
  assert.equal(resolved.widths.type, 280);
  assert.equal(resolved.widths.quantity, 120);
  assert.equal(resolved.defaults.spec, 180);
});

test('resolveSheetWidths: can disable local fallback for preview/print shells', () => {
  const resolved = resolveSheetWidths('五金', null, { preferLocalWhenMissing: false });

  assert.equal(resolved.category, 'hardware');
  assert.deepEqual(resolved.widths, resolved.defaults);
  assert.equal(resolved.widths.spec, 220);
});
