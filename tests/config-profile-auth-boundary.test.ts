import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import { createRequire } from 'node:module';
import type { Router } from 'express';

const _require = createRequire(import.meta.url);
const routesIndexUrl = new URL('../server/routes/index.ts', import.meta.url);

type TestServer = ReturnType<ReturnType<typeof express>['listen']>;

function loadRoutes(): Router {
  delete _require.cache[_require.resolve('../server/routes')];
  return (_require('../server/routes') as { default: Router }).default;
}

async function startRouteAggregatorServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(loadRoutes());

  return await new Promise<{ server: TestServer; baseUrl: string }>((resolve) => {
    const server = app.listen(0, () => {
      const { port } = server.address() as { port: number };
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function closeServer(server: TestServer) {
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => (error ? reject(error) : resolve()));
  });
}

test('config profile routes stay behind the parent /api API key guard', () => {
  const source = fs.readFileSync(routesIndexUrl, 'utf8');
  const authMount = 'router.use(config.api.prefix, apiKeyAuth)';
  const profilesMount = "router.use('/api/config/profiles', configProfilesRoutes)";
  const mastersMount = "router.use('/api/config/masters', configMastersRoutes)";

  const authIndex = source.indexOf(authMount);
  const profilesIndex = source.indexOf(profilesMount);
  const mastersIndex = source.indexOf(mastersMount);

  assert.notEqual(authIndex, -1, 'Expected /api API key guard to be mounted in the route aggregator');
  assert.notEqual(profilesIndex, -1, 'Expected config profile routes to be mounted in the route aggregator');
  assert.notEqual(mastersIndex, -1, 'Expected config master routes to be mounted in the route aggregator');
  assert.ok(authIndex < profilesIndex, 'Config profile routes must inherit the /api API key guard');
  assert.ok(authIndex < mastersIndex, 'Config master routes must inherit the /api API key guard');
});

test('runtime config profile and master routes reject missing API keys', async () => {
  const originalApiKey = process.env.API_KEY;
  let server: TestServer | undefined;

  process.env.API_KEY = 'config-profile-runtime-auth-test';

  try {
    const started = await startRouteAggregatorServer();
    server = started.server;
    const { baseUrl } = started;

    for (const route of [
      '/api/orders',
      '/api/config/profiles/formulas/metadata',
      '/api/config/profiles/formulas/bom-recommendations',
      '/api/config/masters/suppliers',
    ]) {
      const response = await fetch(`${baseUrl}${route}`);
      const body = await response.json() as { success?: boolean; code?: string };

      assert.equal(response.status, 401, `${route} should reject requests without x-api-key`);
      assert.equal(body.success, false);
      assert.equal(body.code, 'UNAUTHORIZED');
    }
  } finally {
    if (server) {
      await closeServer(server);
    }

    if (originalApiKey === undefined) {
      delete process.env.API_KEY;
    } else {
      process.env.API_KEY = originalApiKey;
    }
  }
});
