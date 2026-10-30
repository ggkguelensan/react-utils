import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
await mkdir('tmp', { recursive: true });
// Resolve both Reflect's CJS imports and application ESM imports to one Effector instance.
await build({
  entryPoints: ['tests/integrations/libraries.test.tsx'], outfile: 'tmp/integrations.test.mjs',
  banner: { js: 'import { createRequire as createNodeRequire } from "node:module"; const require = createNodeRequire(import.meta.url);' },
  bundle: true, platform: 'node', format: 'esm', target: 'node24', jsx: 'automatic',
  external: ['node:*', 'jsdom', 'react', 'react/*', 'react-dom', 'react-dom/*'],
  plugins: [{ name: 'single-effector-instance', setup(build) {
    build.onResolve({ filter: /^(effector|effector-react)$/ }, args => ({ path: fileURLToPath(import.meta.resolve(args.path)) }));
  } }],
});
const result = spawnSync(process.execPath, ['--test', 'tmp/integrations.test.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
