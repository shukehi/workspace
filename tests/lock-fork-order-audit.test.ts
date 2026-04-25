import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readLockForkAuditOptions,
  shouldMuteLockForkAuditBootstrapLogs,
} from '../server/services/orders/lock-fork-order-audit';

test('lock-fork audit options: plain json mode keeps bootstrap logs enabled', () => {
  const options = readLockForkAuditOptions(['--json']);
  assert.deepEqual(options, {
    json: true,
    jsonClean: false,
    includeAligned: false,
  });
  assert.equal(shouldMuteLockForkAuditBootstrapLogs(options), false);
});

test('lock-fork audit options: json-clean implies json and mutes bootstrap logs', () => {
  const options = readLockForkAuditOptions(['--json-clean', '--include-aligned']);
  assert.deepEqual(options, {
    json: true,
    jsonClean: true,
    includeAligned: true,
  });
  assert.equal(shouldMuteLockForkAuditBootstrapLogs(options), true);
});
