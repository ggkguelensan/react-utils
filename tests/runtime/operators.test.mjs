import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement as h, createContext, useContext, useState, memo } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pipe, withHook, withStaticProps, mapProps, withGuard, withSuspense, withErrorBoundary, withContext, withWrapper } from '@ggkguelensan/react-hoc';
import { act, mount } from './dom.mjs';

test('static values win and mapProps removes hook-only inputs', () => {
  let seen;
  const View = p => { seen = p; return h('b', null, p.title + p.variant); };
  const V = pipe(View, mapProps(p => ({ title: p.title, variant: p.variant })), withHook(p => ({ title: String(p.id) })), withStaticProps({ variant: 'full' }));
  assert.equal(renderToStaticMarkup(h(V, { id: 2, title: 'wrong', variant: 'compact' })), '<b>2full</b>');
  assert.deepEqual(seen, { title: '2', variant: 'full' });
});

test('Provider covers hooks and wrapper owns children while preserving View props', () => {
  const Theme = createContext('light');
  const Layout = ({ heading, children }) => h('section', { 'data-title': heading }, children);
  const V = pipe(p => h('b', null, p.theme), withHook(() => ({ theme: useContext(Theme) })), withContext(Theme, p => p.selectedTheme), withWrapper(Layout, p => ({ heading: p.title, children: 'wrong' })));
  assert.equal(renderToStaticMarkup(h(V, { selectedTheme: 'dark', title: 'Profile' })), '<section data-title="Profile"><b>dark</b></section>');
});

test('guard unmounts hooks and a reopened guard starts fresh state', async () => {
  let increment, calls = 0;
  const V = pipe(p => h('b', null, p.count), withHook(() => {
    calls++;
    const [count, setCount] = useState(0);
    increment = () => setCount(n => n + 1);
    return { count };
  }), withGuard(p => p.open, { fallback: p => h('i', null, p.label) }));
  const app = mount();
  try {
    await app.render(h(V, { open: false, label: 'closed' }));
    assert.equal(calls, 0); assert.equal(app.element.textContent, 'closed');
    await app.render(h(V, { open: true }));
    await act(async () => increment());
    assert.equal(app.element.textContent, '1');
    await app.render(h(V, { open: false, label: 'closed' }));
    await app.render(h(V, { open: true }));
    assert.equal(app.element.textContent, '0');
  } finally { await app.dispose(); }
});

test('hook state is independent and stable; memoized View skips irrelevant updates', async () => {
  const setters = new Map(); let renders = 0;
  const View = memo(p => { renders++; return h('b', null, p.count); });
  const V = withHook(p => {
    const [count, setCount] = useState(0);
    setters.set(p.id, setCount);
    return { count };
  })(View);
  const app = mount();
  try {
    await app.render(h('div', null, h(V, { id: 1 }), h(V, { id: 2 })));
    assert.equal(renders, 2);
    await act(async () => setters.get(1)(3));
    assert.equal(app.element.textContent, '30'); assert.equal(renders, 3);
    await app.render(h('div', null, h(V, { id: 1 }), h(V, { id: 2 })));
    assert.equal(app.element.textContent, '30'); assert.equal(renders, 3);
  } finally { await app.dispose(); }
});

test('Suspense fallback receives outer inputs and resolves suspended hooks', async () => {
  let ready = false, resolve;
  const pending = new Promise(r => { resolve = r; });
  const V = pipe(p => h('b', null, p.title), withHook(() => {
    if (!ready) throw pending;
    return { title: 'ready' };
  }), withSuspense({ fallback: p => h('i', null, p.label) }));
  const app = mount();
  try {
    await app.render(h(V, { label: 'loading' }));
    assert.equal(app.element.textContent, 'loading');
    await act(async () => { ready = true; resolve(); await pending; });
    assert.equal(app.element.textContent, 'ready');
  } finally { await app.dispose(); }
});

test('boundary catches arbitrary thrown values, resets with current props, and catches again', async () => {
  let fail = true, retry; const errors = [], resets = [];
  const V = withErrorBoundary({
    fallback: (error, reset, p) => { retry = reset; return h('b', null, `${error}:${p.label}`); },
    onError: (error, info, p) => { assert.match(info.componentStack, /View/); errors.push([error, p.label]); },
    onReset: p => { resets.push(p.label); },
  })(function View() { if (fail) throw 'failure'; return h('i', null, 'ready'); });
  const app = mount(), original = console.error; console.error = () => {};
  try {
    await app.render(h(V, { label: 'first' }));
    assert.equal(app.element.textContent, 'failure:first');
    await app.render(h(V, { label: 'current' }));
    fail = false;
    await act(async () => retry());
    assert.equal(app.element.textContent, 'ready'); assert.deepEqual(resets, ['current']);
    fail = true;
    await app.render(h(V, { label: 'again' }));
    assert.equal(app.element.textContent, 'failure:again');
    assert.deepEqual(errors, [['failure', 'first'], ['failure', 'again']]);
  } finally { await app.dispose(); console.error = original; }
});
