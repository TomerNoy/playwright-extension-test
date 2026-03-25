/**
 * global-setup.js — Playwright global setup
 *
 * 1. Starts the sync-server (Node.js + ws)
 * 2. Starts a static file server for the web-app (via `serve`)
 * 3. Returns a teardown function that kills both processes cleanly
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

function spawnBackground(cmd, args, cwd) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  proc.stdout?.on('data', (d) => process.stdout.write(`[${path.basename(cwd)}] ${d}`));
  proc.stderr?.on('data', (d) => process.stderr.write(`[${path.basename(cwd)}] ${d}`));
  return proc;
}

function waitForHttp(url, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timeout waiting for ${url}`));
      } else {
        setTimeout(attempt, 300);
      }
    };
    attempt();
  });
}

module.exports = async function globalSetup() {
  const syncServer = spawnBackground('node', ['sync-server/server.js'], ROOT);
  await waitForHttp('http://localhost:8080/health');

  const webServer = spawnBackground(
    'npx',
    ['serve', 'web-app', '-p', '3000', '--no-clipboard'],
    ROOT,
  );
  await waitForHttp('http://localhost:3000');

  // Reset counter to 0 before the suite starts
  await new Promise((resolve) => {
    const req = http.request(
      { method: 'POST', hostname: 'localhost', port: 8080, path: '/reset' },
      () => resolve(),
    );
    req.on('error', () => resolve());
    req.end();
  });

  return async function globalTeardown() {
    syncServer.kill();
    webServer.kill();
  };
};
