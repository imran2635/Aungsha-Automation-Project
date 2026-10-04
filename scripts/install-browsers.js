/**
 * Install Playwright Chromium into project-local .playwright-browsers
 * (stable path — not Cursor sandbox temp cache).
 *
 * Usage: npm.cmd run browsers:install
 */
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const browsersPath = path.join(__dirname, '..', '.playwright-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

console.log(`PLAYWRIGHT_BROWSERS_PATH=${browsersPath}`);
const result = spawnSync(
  'npx.cmd',
  ['playwright', 'install', 'chromium'],
  { stdio: 'inherit', env: process.env, shell: true },
);
process.exit(result.status ?? 1);
