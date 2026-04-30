import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = process.cwd();

function read(filePath: string): string {
  return fs.readFileSync(`${ROOT}/${filePath}`, 'utf8');
}

function envExampleValue(name: string): string | undefined {
  const line = read('.env.example')
    .split('\n')
    .find((entry) => entry.replace(/^#\s*/, '').startsWith(`${name}=`));

  return line?.replace(/^#\s*/, '').slice(name.length + 1).trim();
}

const releaseEnvNames = [
  'API_KEY',
  'VITE_API_KEY',
  'CORS_ORIGIN',
  'PRINT_RENDER_BASE_URL',
] as const;

test('release env example documents required production configuration names', () => {
  const envExample = read('.env.example');

  for (const envName of releaseEnvNames) {
    assert.match(envExample, new RegExp(`(^|\\n)#?\\s*${envName}=`), `${envName} must stay documented in .env.example`);
  }

  assert.equal(
    envExampleValue('API_KEY'),
    envExampleValue('VITE_API_KEY'),
    'backend API_KEY and frontend VITE_API_KEY examples must stay aligned',
  );
  assert.match(envExample, /生产环境必须配置，否则所有 \/api 请求返回 500/);
  assert.match(envExample, /不填则默认 http:\/\/localhost:5173/);
  assert.match(envExample, /Required in production: unified render base url for PDF\/print/);
});

test('release runtime contract names the production env boundaries', () => {
  const runtimeContract = read('docs/reference/RUNTIME_CONTRACT_2026-04-16.md');
  const serverEnv = read('server/config/env.ts');
  const clientApi = read('src/lib/api.ts');
  const viteTypes = read('src/vite-env.d.ts');
  const releaseChecklist = read('docs/progress/RELEASE_CONFIGURATION_VERIFICATION_2026-04-30.md');

  assert.match(runtimeContract, /production[^\n]+PRINT_RENDER_BASE_URL|PRINT_RENDER_BASE_URL[^\n]+production/);
  assert.match(runtimeContract, /API_KEY/);
  assert.match(runtimeContract, /production|生产环境/);
  assert.match(runtimeContract, /SERVER_MISCONFIGURATION|硬错误/);
  assert.match(serverEnv, /CORS_ORIGIN\.split\(','\)\.map\(\(s\) => s\.trim\(\)\)/);
  assert.match(serverEnv, /credentials:\s*true/);
  assert.match(clientApi, /VITE_API_KEY/);
  assert.match(clientApi, /'x-api-key'/);
  assert.match(viteTypes, /readonly VITE_API_KEY\?: string/);
  for (const envName of releaseEnvNames) {
    assert.match(releaseChecklist, new RegExp('`' + envName + '`'), `${envName} must stay present in the release checklist`);
  }
});
