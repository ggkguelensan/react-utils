import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
await mkdir('tmp', { recursive: true });
const consumer = await mkdtemp(resolve('tmp/package-consumer-'));
const modules = resolve(consumer, 'node_modules', ...pkg.name.split('/'));
await mkdir(modules, { recursive: true });
execFileSync('pnpm', ['pack', '--out', 'tmp/react-hoc.tgz'], { stdio: 'inherit' });
execFileSync('tar', ['-xzf', resolve('tmp/react-hoc.tgz'), '--strip-components=1', '-C', modules]);
const packed = JSON.parse(await readFile(resolve(modules, 'package.json'), 'utf8'));
assert.equal(packed.name, pkg.name);
assert.equal(packed.sideEffects, false);
for (const entry of Object.values(packed.exports)) {
  await access(resolve(modules, entry.import));
  await access(resolve(modules, entry.types));
}
await writeFile(resolve(consumer, 'package.json'), '{"private":true,"type":"module"}\n');
const exportNames = ['pipe', 'withHook', 'withStaticProps', 'mapProps', 'withGuard', 'withSuspense', 'withErrorBoundary', 'withContext', 'withWrapper'];
const source = `import * as root from '${pkg.name}';\n` + Object.keys(pkg.exports).filter(k => k !== '.').map(path =>
  `import * as sub${path.replace(/[^a-z]/g, '')} from '${pkg.name}${path.slice(1)}';\n`).join('') +
  `const View = (p: { title: string; variant: 'full' | 'compact' }) => null;\nconst V = root.pipe(View, root.withStaticProps({variant:'full'}), root.withHook((p:{id:number})=>({title:String(p.id)})));\n<V id={1} />;\n// @ts-expect-error missing hook input\n<V />;\n`;
await writeFile(resolve(consumer, 'index.tsx'), source);
await writeFile(resolve(consumer, 'tsconfig.json'), JSON.stringify({compilerOptions:{target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext',strict:true,jsx:'react-jsx',noEmit:true},include:['index.tsx']}));
execFileSync('pnpm', ['exec','tsc','-p',resolve(consumer,'tsconfig.json')], { stdio:'inherit' });
await writeFile(resolve(consumer, 'index.mjs'), `import assert from 'node:assert/strict';\nimport * as api from '${pkg.name}';\nassert.deepEqual(Object.keys(api).sort(), ${JSON.stringify(exportNames.sort())});\nassert.equal(api.pipe(1, n=>n+1),2);\n`);
execFileSync(process.execPath, [resolve(consumer, 'index.mjs')], { stdio:'inherit' });
console.log('Packed JS/declaration exports and consumer type/runtime imports passed.');
