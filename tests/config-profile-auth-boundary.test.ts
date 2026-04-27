import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const routesIndexUrl = new URL('../server/routes/index.ts', import.meta.url);

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
