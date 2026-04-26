import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeLogLevel } from '../server/app/logger';

test('normalizeLogLevel accepts all supported log levels explicitly', () => {
  assert.equal(normalizeLogLevel('debug'), 'debug');
  assert.equal(normalizeLogLevel('info'), 'info');
  assert.equal(normalizeLogLevel('warn'), 'warn');
  assert.equal(normalizeLogLevel('error'), 'error');
});

test('normalizeLogLevel falls back to info for missing or unsupported values', () => {
  assert.equal(normalizeLogLevel(undefined), 'info');
  assert.equal(normalizeLogLevel('verbose'), 'info');
  assert.equal(normalizeLogLevel(''), 'info');
});
