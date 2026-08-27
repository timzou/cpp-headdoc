import { runTests } from '@vscode/test-electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

try {
  await runTests({
    version: '1.134.0',
    extensionDevelopmentPath: root,
    extensionTestsPath: resolve(root, 'dist-test', 'integration.js'),
    launchArgs: [resolve(root, 'test', 'fixtures'), '--disable-extensions'],
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
