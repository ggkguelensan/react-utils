import { act, mount } from '../runtime/dom.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createEvent, fork, allSettled } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { reflect } from '@effector/reflect';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useQuery, useSuspenseQuery, useQueryErrorResetBoundary } from '@tanstack/react-query';
import { pipe, withHook, withStaticProps, withSuspense, withErrorBoundary, withWrapper } from '@ggkguelensan/react-hoc';

function renderProviders(client, scope, children) {
  return <Provider value={scope}><QueryClientProvider client={client}>{children}</QueryClientProvider></Provider>;
}

test('Query select + Reflect bindings + Effector Scope update the View and bind events to its Scope', async () => {
  const changed = createEvent<string>(), opened = createEvent();
  const $id = createStore('1', { sid: 'integration/id' }).on(changed, (_, id) => id);
  const $locale = createStore('en', { sid: 'integration/locale' });
  const $opens = createStore(0, { sid: 'integration/opens' }).on(opened, n => n + 1);
  const scope = fork({ values: [[$id, '7'], [$locale, 'ru']] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['profile', '7', 'ru'], { name: 'Ada', ignored: 1 });
  client.setQueryData(['profile', '8', 'ru'], { name: 'Grace', ignored: 2 });
  function usePresentation({ userId }: { userId: string }) {
    const { locale, onOpen } = useUnit({ locale: $locale, onOpen: opened });
    const { data } = useQuery({ queryKey: ['profile', userId, locale], queryFn: async () => ({ name: 'network' }), select: value => value.name });
    return { name: data, onOpen };
  }
  const V = pipe(
    (p: { name: string | undefined; onOpen: () => void; variant: 'full' }) => <button onClick={p.onOpen}>{p.name}:{p.variant}</button>,
    withStaticProps({ variant: 'full' }), withHook(usePresentation),
    view => reflect({ view, bind: { userId: $id } }),
  );
  const app = mount();
  try {
    await app.render(renderProviders(client, scope, <V />));
    assert.equal(app.element.textContent, 'Ada:full');
    await act(async () => app.element.querySelector('button').click());
    assert.equal(scope.getState($opens), 1); assert.equal($opens.getState(), 0);
    await act(async () => { await allSettled(changed, { scope, params: '8' }); });
    assert.equal(app.element.textContent, 'Grace:full');
  } finally { await app.dispose(); client.clear(); }
});

test('Suspense Query shows pending UI, catches failure and retries through Query reset', async () => {
  let resolveRequest, rejectRequest, attempts = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function usePresentation({ userId }: { userId: string }) {
    const { data } = useSuspenseQuery({
      queryKey: ['retry-profile', userId],
      queryFn: () => { attempts++; return new Promise<string>((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; }); },
    });
    return { name: data };
  }
  const V = pipe(
    (p: { name: string }) => <b>{p.name}</b>, withHook(usePresentation),
    withSuspense({ fallback: <i>loading</i> }),
    withErrorBoundary({
      onReset: (p: { resetQuery: () => void }) => p.resetQuery(),
      fallback: (_error, reset) => <button onClick={reset}>retry</button>,
    }),
    withHook(function useReset() { return { resetQuery: useQueryErrorResetBoundary().reset }; }),
    withWrapper(QueryErrorResetBoundary),
  );
  const app = mount(), original = console.error;
  console.error = () => {};
  try {
    await app.render(<QueryClientProvider client={client}><V userId="1" /></QueryClientProvider>);
    assert.equal(app.element.textContent, 'loading'); assert.equal(attempts, 1);
    await act(async () => { rejectRequest(new Error('request failed')); await new Promise(resolve => setTimeout(resolve, 0)); });
    assert.equal(app.element.textContent, 'retry');
    await act(async () => app.element.querySelector('button').click());
    assert.equal(app.element.textContent, 'loading'); assert.equal(attempts, 2);
    await act(async () => { resolveRequest('recovered'); await new Promise(resolve => setTimeout(resolve, 0)); });
    assert.equal(app.element.textContent, 'recovered');
  } finally { await app.dispose(); client.clear(); console.error = original; }
});
