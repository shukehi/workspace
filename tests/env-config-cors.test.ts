import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const _require = createRequire(import.meta.url);
const envConfigPath = _require.resolve('../server/config/env');

const originalCorsOrigin = process.env.CORS_ORIGIN;

function loadEnvConfig(corsOrigin: string | undefined) {
  if (corsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = corsOrigin;
  }
  delete _require.cache[envConfigPath];
  return (_require('../server/config/env') as { default: { cors: { origin: string | string[]; credentials: boolean } } }).default;
}

test.afterEach(() => {
  if (originalCorsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  }
  delete _require.cache[envConfigPath];
});

test('env config CORS default stays explicit and credential-safe', () => {
  const config = loadEnvConfig(undefined);

  assert.equal(config.cors.origin, 'http://localhost:5173');
  assert.equal(config.cors.credentials, true);
});

test('env config CORS_ORIGIN supports trimmed comma-separated allowlist', () => {
  const config = loadEnvConfig('http://localhost:5173, http://127.0.0.1:5173');

  assert.deepEqual(config.cors.origin, ['http://localhost:5173', 'http://127.0.0.1:5173']);
  assert.equal(config.cors.credentials, true);
});
