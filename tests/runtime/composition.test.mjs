import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { pipe, withHook } from '@ggkguelensan/react-utils';

test('pipe runs left to right and preserves identity with no operators', () => {
  const value = { count: 1 };
  assert.equal(pipe(value), value);
  assert.equal(pipe(2, n => n + 1, n => n * 2, String), '6');
});

test('withHook forwards unrelated props and hook results win collisions', () => {
  const View = ({ title, subtitle }) => createElement('span', null, `${title}:${subtitle}`);
  const Connected = withHook(({ eventId }) => ({ title: String(eventId) }))(View);
  // Deliberately bypass the TS contract to exercise precedence at runtime.
  assert.equal(renderToStaticMarkup(createElement(Connected, {
    eventId: 42, title: 'override', subtitle: 'Almaty',
  })), '<span>42:Almaty</span>');
});

test('dependent hooks can share values within one ViewModel', () => {
  const View = ({ label }) => createElement('span', null, label);
  const Connected = withHook(({ initial }) => {
    const [count] = useState(initial);
    const [label] = useState(() => `Count ${count}`);
    return { label };
  })(View);
  assert.equal(renderToStaticMarkup(createElement(Connected, { initial: 3 })), '<span>Count 3</span>');
});

test('HOCs run outside in while pipe constructs the component left to right', () => {
  const calls = [];
  const View = ({ name1, name2, suffix }) => createElement('span', null, name1 + name2 + suffix);
  const Connected = pipe(
    View,
    withHook(({ value1 }) => { calls.push('inner'); return { name1: String(value1) }; }),
    withHook(({ value2 }) => { calls.push('outer'); return { name2: String(value2) }; }),
  );
  assert.equal(renderToStaticMarkup(createElement(Connected, { value1: 1, value2: 2, suffix: '!' })), '<span>12!</span>');
  assert.deepEqual(calls, ['outer', 'inner']);
});

test('displayName identifies the wrapped View', () => {
  function ExampleView() { return null; }
  assert.equal(withHook(() => ({}))(ExampleView).displayName, 'withHook(ExampleView)');
});
