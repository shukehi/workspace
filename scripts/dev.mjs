import { spawn } from 'node:child_process';
import path from 'node:path';

const rootDir = process.cwd();
const isWindows = process.platform === 'win32';
const tsxBin = path.join(rootDir, 'node_modules', '.bin', isWindows ? 'tsx.cmd' : 'tsx');
const viteBin = path.join(rootDir, 'node_modules', '.bin', isWindows ? 'vite.cmd' : 'vite');
const isLan = process.argv.includes('--lan');

function prefixStream(stream, writer, prefix) {
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    const lines = chunk.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line && index === lines.length - 1) {
        continue;
      }
      writer.write(`${prefix}${line}\n`);
    }
  });
}

const serverProcess = spawn(tsxBin, ['watch', 'server/index.ts'], {
  cwd: rootDir,
  env: {
    ...process.env,
    NODE_ENV: 'development',
  },
  stdio: ['inherit', 'pipe', 'pipe'],
});

const viteArgs = isLan ? ['--host', '0.0.0.0'] : [];
const viteProcess = spawn(viteBin, viteArgs, {
  cwd: rootDir,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe'],
});

prefixStream(serverProcess.stdout, process.stdout, '[server] ');
prefixStream(serverProcess.stderr, process.stderr, '[server] ');
prefixStream(viteProcess.stdout, process.stdout, '[vite] ');
prefixStream(viteProcess.stderr, process.stderr, '[vite] ');

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  serverProcess.kill('SIGTERM');
  viteProcess.kill('SIGTERM');
  setTimeout(() => process.exit(exitCode), 100);
}

serverProcess.on('exit', (code) => {
  shutdown(code ?? 0);
});

viteProcess.on('exit', (code) => {
  shutdown(code ?? 0);
});

process.on('SIGINT', () => shutdown(130));
process.on('SIGTERM', () => shutdown(143));
