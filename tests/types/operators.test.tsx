import { createContext, createRef, memo } from 'react';
import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import {
  pipe, withHook, withStaticProps, mapProps, withGuard, withSuspense,
  withErrorBoundary, withContext, withWrapper,
} from '@ggkguelensan/react-hoc';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
const View = (p: { title: string; variant: 'full' | 'compact'; optional?: number }) => <span>{p.title}</span>;
const Full = withStaticProps({ variant: 'full' })(View);
<Full title="hello" />;
<Full title="hello" optional={1} />;
// @ts-expect-error fixed prop is removed
<Full title="hello" variant="compact" />;
// @ts-expect-error remaining required prop
<Full />;
// @ts-expect-error fixed value incompatible with View
withStaticProps({ variant: 'wrong' })(View);
// @ts-expect-error optional output cannot satisfy required prop
withStaticProps({} as { title?: string })(View);
// @ts-expect-error no array props
withStaticProps([1]);
// @ts-expect-error special React prop
withStaticProps({ key: 'x' });
// @ts-expect-error special React prop
withHook(() => ({ ref: createRef() }));

const Union = withStaticProps({ title: 'bound' })(
  (p: { title: string } & ({ kind: 'id'; id: number } | { kind: 'slug'; slug: string })) => <span />,
);
<Union kind="id" id={1} />;
// @ts-expect-error correlation is preserved
<Union kind="id" slug="x" />;

const Mapped = mapProps((p: { name: string }) => ({ title: p.name, variant: 'full' as const }))(View);
<Mapped name="Ada" />;
// @ts-expect-error original props no longer external
<Mapped title="Ada" />;
// @ts-expect-error mapper must supply all required props
mapProps((p: { name: string }) => ({ title: p.name }))(View);
// @ts-expect-error maybe undefined cannot satisfy title
mapProps(() => ({ title: undefined as string | undefined, variant: 'full' as const }))(View);
// @ts-expect-error no async mapper
mapProps(async () => ({ title: 'x' }));
// @ts-expect-error no ref injection
mapProps(() => ({ ref: createRef() }));

const Guarded = withGuard((p: { userId: number }) => p.userId > 0, {
  fallback: p => <span>{p.userId}</span>,
})(Full);
<Guarded userId={1} title="x" />;
// @ts-expect-error guard inputs remain required
<Guarded title="x" />;
// @ts-expect-error View props remain required
<Guarded userId={1} />;
// @ts-expect-error predicate must return boolean
withGuard(() => 'yes');
const NoNarrowing = withGuard((p: { title: string | null }) => p.title !== null)(Full);
// @ts-expect-error boolean guard does not narrow title
<NoNarrowing title={null} />;
const Wait = withSuspense({ fallback: (p: { skeleton: string }) => <span>{p.skeleton}</span> })(Full);
<Wait title="x" skeleton="loading" />;
// @ts-expect-error fallback input required
<Wait title="x" />;
const Boundary = withErrorBoundary({
  fallback: (error, reset, p: { retryLabel: string }) => {
    // @ts-expect-error thrown values are unknown
    error.message;
    return <button onClick={reset}>{p.retryLabel}</button>;
  },
  onError(error, info, p) { const text: string = p.retryLabel; const stack: string | null | undefined = info.componentStack; },
  onReset(p) { const text: string = p.retryLabel; },
})(Full);
<Boundary title="x" retryLabel="retry" />;
// @ts-expect-error boundary input required
<Boundary title="x" />;

const Theme = createContext<'light' | 'dark'>('light');
const Themed = withContext(Theme, (p: { theme: 'light' | 'dark' }) => p.theme)(Full);
<Themed title="x" theme="dark" />;
// @ts-expect-error invalid provider value
withContext(Theme, () => 'wrong');
// @ts-expect-error missing provider input
<Themed title="x" />;
const FunctionContext = createContext<() => number>(() => 1);
withContext(FunctionContext, () => () => 2)(Full);
const NullableContext = createContext<string | null>(null);
withContext(NullableContext, () => null)(Full);
// @ts-expect-error resolver inputs must be objects
withContext(Theme, (p: string) => 'dark');
// @ts-expect-error unannotated resolver props cannot silently become any
withContext(Theme, p => p.theme);

const Layout = (p: { heading: string; children: ReactNode }) => <section>{p.heading}{p.children}</section>;
const Wrapped = withWrapper(Layout, (p: { heading: string }) => ({ heading: p.heading }))(Full);
<Wrapped title="x" heading="Page" />;
// @ts-expect-error required wrapper props cannot be omitted
withWrapper(Layout);
// @ts-expect-error mapper must provide required wrapper props
withWrapper(Layout, () => ({}));
// @ts-expect-error children are library-owned
withWrapper(Layout, () => ({ heading: 'x', children: <span /> }));
const unionWrapperProps = (): { heading: string } | { heading: string; children: string } => ({ heading: 'x' });
// @ts-expect-error every union branch must leave children to the library
withWrapper(Layout, unionWrapperProps);
// @ts-expect-error incompatible wrapper prop
withWrapper(Layout, () => ({ heading: 1 }));
// @ts-expect-error invalid wrapper mapper result
withWrapper(Layout, async () => ({ heading: 'x' }));
const Shell = (p: PropsWithChildren) => <section>{p.children}</section>;
withWrapper(Shell)(Full);
// @ts-expect-error cannot wrap a component requiring a different children type
withWrapper((p: { children: string }) => <span>{p.children}</span>);

const Composed = pipe(
  memo(View), withStaticProps({ variant: 'full' }),
  withHook((p: { id: number }) => ({ title: String(p.id) })),
  withGuard((p: { id: number }) => p.id > 0),
  withSuspense({ fallback: null }),
  withErrorBoundary({ fallback: null }),
  withContext(Theme, () => 'dark'),
  withWrapper(Shell),
);
<Composed id={1} />;
// @ts-expect-error external input remains required
<Composed />;
// @ts-expect-error no ref forwarding
<Composed id={1} ref={createRef()} />;
// @ts-expect-error fixed fields are not external props
<Composed id={1} variant="full" />;
export type Checks = [
  Expect<Equal<ComponentProps<typeof Mapped>['name'], string>>,
  Expect<Equal<ComponentProps<typeof Guarded>['userId'], number>>,
  Expect<Equal<IsAny<ComponentProps<typeof Composed>>, false>>,
];
