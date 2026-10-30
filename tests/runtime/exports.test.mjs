import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import * as api from '@ggkguelensan/react-hoc';
test('every public subpath exports the same utility as the root', async () => {
  const pkg = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  for (const path of Object.keys(pkg.exports).filter(path => path !== '.')) {
    const module = await import(pkg.name + path.slice(1));
    const [name] = Object.keys(module);
    assert.equal(module[name], api[name]);
    assert.equal(Object.keys(module).length, 1);
  }
});
