# react-hoc

Small, typed higher-order components for React. Connect hooks, bind props, and compose wrappers with ordinary React components and `pipe`.

This repository is not published to npm. The package name is `@ggkguelensan/react-hoc`; the GitHub repository URL remains `ggkguelensan/react-utils`.

## Quick start

```tsx
import { useState } from 'react';
import { pipe, withHook } from '@ggkguelensan/react-hoc';

function CounterView(props: {
  count: number;
  increment: () => void;
  label: string;
}) {
  return <button onClick={props.increment}>{props.label}: {props.count}</button>;
}

function useCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  return { count, increment: () => setCount(value => value + 1) };
}

const Counter = pipe(CounterView, withHook(useCounter));

<Counter initial={0} label="Tickets" />;
```

`count` and `increment` come from the hook. `initial` becomes an external requirement; `label` passes through. The View does not need to declare hook-only inputs.

```text
View props:       count, increment, label
Hook inputs:      initial
Hook outputs:     count, increment
External props:   initial, label
```

Every utility accepts a component and returns a component. Use it directly or with any compatible composition function:

```tsx
const Counter = withHook(useCounter)(CounterView);
```

Complete examples in [`examples/`](./examples) are checked by TypeScript in CI. Documentation snippets below assume application-specific Views, hooks, and models.

## Imports

All utilities have root and subpath exports:

```tsx
import { pipe, withHook, withGuard } from '@ggkguelensan/react-hoc';

// Alternatively:
import { withHook } from '@ggkguelensan/react-hoc/with-hook';
import { withGuard } from '@ggkguelensan/react-hoc/with-guard';
```

The package is ESM with `sideEffects: false`. React is a peer dependency. `pipe` is a direct re-export from `effect/Function`, retaining its checked overloads; importing a HOC without `pipe` does not retain Effect in the measured bundle. TanStack Query, Effector, Reflect, and `react-error-boundary` are development dependencies used in examples and tests, not dependencies of the HOCs.

## Composition order

`pipe` applies functions left to right. Each HOC wraps the previous result, so rendering proceeds outside in.

```tsx
const Profile = pipe(
  ProfileView,
  withHook(useProfilePresentation),
  withGuard(
    (props: { userId: string }) => Boolean(props.userId),
    { fallback: <SelectUser /> },
  ),
  withSuspense({ fallback: <ProfileSkeleton /> }),
);
```

```text
Suspense
└── Guard
    └── WithHook
        └── ProfileView
```

The guard can prevent the hook from mounting. It cannot read the result of that inner hook. To check a hook result, put the hook outside the guard:

```tsx
const Profile = pipe(
  ProfileView,
  withGuard(
    (props: { canRead: boolean }) => props.canRead,
    { fallback: <AccessDenied /> },
  ),
  withHook(useProfilePresentation), // returns { canRead, ... }
);
```

```text
WithHook
└── Guard
    └── ProfileView
```

Create enhanced components at module scope, not during another component's render. See [`examples/composition-order.tsx`](./examples/composition-order.tsx).

## API overview

| Utility | Result |
| --- | --- |
| `withHook(usePresentation)` | Inject hook results while forwarding other props |
| `withStaticProps(values)` | Fix props and remove them from external requirements |
| `mapProps(mapper)` | Replace incoming props with the mapper result |
| `withGuard(predicate, options?)` | Mount the View only when the predicate passes |
| `withSuspense({ fallback })` | Wrap the View in Suspense |
| `withErrorBoundary(options)` | Catch descendant render errors and expose reset |
| `withContext(Context, resolveValue)` | Wrap the View in a React Context Provider |
| `withWrapper(Wrapper, resolveProps?)` | Wrap the View using library-owned `children` |
| `pipe(value, ...operators)` | Standard function composition from Effect |

There is no scope object, component builder, or accumulating HOC context. Data flows through props and ordinary React Context.

## `withHook`

```tsx
const Profile = withHook(useProfilePresentation)(ProfileView);
```

The hook synchronously returns a props object. Its result wins over incoming props with the same names; unrelated incoming props pass through.

```text
External props = Hook inputs & (View props minus injected keys)
```

Compatibility is checked against the View. An optional value cannot satisfy a required prop. Discriminated unions are preserved, and every injected union branch must be safe. Same-named inputs and outputs can intentionally transform a value, such as `{ value: string }` into `{ value: number }`.

Promises, arrays, functions, primitive results, and results containing `key` or `ref` are rejected by the public types. Return a small object containing the props the View needs.

When hooks depend on one another, combine them explicitly:

```tsx
function useProfilePresentation({ userId }: { userId: string }) {
  const user = useUser(userId);
  const permissions = usePermissions(user);
  return { user, permissions };
}
```

Multiple independent HOCs remain composable:

```tsx
const Header = pipe(HeaderView, withHook(useTitle), withHook(useSubtitle));
// useSubtitle executes before useTitle: it is the outer wrapper.
```

Keep hook calls unconditional and in a fixed order inside the presentation hook. Generic or overloaded hooks may need a concrete typed adapter.

## `withStaticProps`

```tsx
const DangerButton = pipe(Button, withStaticProps({ variant: 'danger' }));
```

Fixed props are checked against the View and removed from the external prop contract. Fixed values win at runtime, including when callers bypass the type system. Other props pass through.

```text
External props = View props minus fixed keys
```

The values are captured when composing the component; treat them as immutable. This utility does not invoke hooks or add values to React Context. Use `mapProps` for values derived from incoming props and `withHook` for values derived with hooks.

TypeScript's structural typing does not reject every object spread containing extra keys; runtime precedence remains the same.

## `mapProps`

```tsx
const UserLabel = pipe(
  NameView,
  mapProps((props: { user: { firstName: string; lastName: string } }) => ({
    name: `${props.user.firstName} ${props.user.lastName}`,
  })),
);
```

The mapper returns the entire View prop object. Incoming props are not merged automatically. This is useful for adapting names, deriving values, and filtering hook-only inputs before a View. Use an explicit spread if passthrough is intended.

The output must satisfy all required View props. Mappers must be pure and synchronous and must not call hooks. Special React props `key` and `ref` cannot be mapped as ordinary props.

## `withGuard`

```tsx
withGuard(
  (props: { userId: string }) => Boolean(props.userId),
  { fallback: props => <SelectUser previousId={props.userId} /> },
)(ProfileView);
```

A passing predicate renders the View with incoming props. A failing predicate renders the static or functional fallback, or `null` if omitted. Predicate and fallback inputs become external requirements alongside the View's props.

The predicate must return a boolean and must not call hooks. The guard does not narrow the View's TypeScript props; a successful runtime check does not make a nullable View prop non-nullable in the types.

Closing the guard unmounts the child tree. Reopening it creates fresh local hook state. Place it outside expensive hooks when it should prevent their subscriptions or requests from starting.

## `withSuspense`

```tsx
withSuspense({ fallback: <ProfileSkeleton /> })(Profile);

withSuspense({
  fallback: (props: { variant: string }) => <ProfileSkeleton variant={props.variant} />,
})(Profile);
```

This adds a React Suspense boundary around the View. It does not resolve arbitrary Promise props or turn ordinary `useQuery` into a Suspense query. Use `useSuspenseQuery` or another source that suspends rendering.

Functional fallbacks see the boundary's external props, not unfinished results from inner hooks. Errors require an Error Boundary.

## `withErrorBoundary`

```tsx
const Profile = pipe(
  ProfileView,
  withHook(useProfilePresentation),
  withErrorBoundary({
    fallback: (error, reset, props) => <ProfileError error={error} onRetry={reset} />,
    onError: (error, info, props) => reportError(error, info),
    onReset: props => resetApplicationError(),
  }),
);
```

- `fallback` is a React node or `(error, reset, props) => ReactNode`.
- `onError` receives `(error, info, props)` after React catches a descendant error.
- `onReset` receives the boundary's current props before its error state is cleared.
- Thrown values are typed as `unknown`.

Callback prop requirements are inferred from their annotated input. `reset` retries the child tree; if it throws again, the fallback appears again. Updating props alone does not reset a failed boundary. To force a fresh boundary, change the enhanced component's `key`.

This follows React Error Boundary semantics. It does not catch ordinary event-handler errors, arbitrary asynchronous callbacks, its own errors, or server-rendering errors. Query retry also needs Query's error-reset integration; clearing the boundary alone is insufficient.

## `withContext`

```tsx
const Profile = pipe(
  ProfileView,
  withHook(useProfilePresentation),
  withContext(ThemeContext, (props: { theme: Theme }) => props.theme),
);
```

The Provider is outside the hook wrapper, so both the hook and View can read it. The resolver is checked against the Context's value type. Constant values still use a resolver:

```tsx
withContext(ThemeContext, () => darkTheme);
```

The resolver is pure and must not call hooks. For hook-derived Provider values, write a normal Provider component and use `withWrapper`. Context values are not automatically copied into View props. Object identity and updates follow normal React Context semantics.

## `withWrapper`

```tsx
withWrapper(PageLayout, (props: { title: string }) => ({ heading: props.title }))(ProfileView);

// A wrapper needing only children:
withWrapper(QueryBoundary)(ProfileView);
```

The resolver supplies wrapper props; incoming props also pass through unchanged to the View. Required wrapper props must be supplied. The library owns `children`, which cannot be returned by the resolver. A wrapper must accept the React element rendered as its child.

Resolvers must not call hooks. The Wrapper itself is a normal React component and may use hooks.

## Recipes

### TanStack Query: explicit loading and error states

```tsx
function useProfilePresentation({ userId }: { userId: string }) {
  const { data: name, isPending, error, refetch } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
    select: profile => profile.name,
  });
  return { name, isPending, error, refetch };
}

const Profile = withHook(useProfilePresentation)(ProfileView);
```

Transform successful response data in `select`; keep Query's loading state, error, and refetch function as separate props. `select` receives data, not the query result, so it cannot produce the pending/error states. The cache still holds the original Profile. The View shows a skeleton while `isPending`, an error with a refetch action when `error` is present, and the selected name otherwise. `name` is typed as `string | undefined` before success.

Render under `QueryClientProvider`. This example chooses an error screen even for a failed background refetch; applications can choose a different stale-data policy.

Return only the selected data and Query fields the View needs rather than `{ ...query }`. Spreading a Query result reads all its properties and broadens tracked subscriptions. See the [complete example](./examples/query.tsx) and [Query render optimizations](https://tanstack.com/query/latest/docs/framework/react/guides/render-optimizations).

### Suspense Query and retry

```tsx
function useProfilePresentation({ userId }: { userId: string }) {
  const { data } = useSuspenseQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });
  return { profile: data };
}

const Profile = pipe(
  ProfileCard,
  withHook(useProfilePresentation),
  withSuspense({ fallback: <ProfileSkeleton /> }),
  withWrapper(QueryBoundary),
);
```

A reusable application wrapper connects Query retry to the error boundary:

```tsx
import type { PropsWithChildren } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

function QueryBoundary({ children }: PropsWithChildren) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <ProfileError error={error} onRetry={resetErrorBoundary} />
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

Render below `QueryClientProvider`. `react-error-boundary` is a dependency of this example, not a required runtime dependency of this package. The native `withErrorBoundary` can also use its `onReset(props)` callback with a reset function injected by an outer `withHook`; the integration test covers this path.

A failed background refetch can keep rendering cached data instead of throwing. See the [complete example](./examples/suspense-query.tsx) and [TanStack Suspense guide](https://tanstack.com/query/latest/docs/framework/react/guides/suspense).

### Effector

```tsx
function useCounterPresentation() {
  return useUnit({ count: $count, increment: incrementClicked });
}

const Counter = withHook(useCounterPresentation)(CounterView);
```

Use Effector `Provider` when working with Scope. `useUnit` supplies scope-bound events; do not replace them with unbound global event calls in scoped applications. Create a Scope per request for SSR. See the [complete example](./examples/effector.tsx).

Effector and Query can be combined inside one presentation hook:

```tsx
function useProfilePresentation() {
  const { userId, locale, onOpen } = useUnit({
    userId: $userId, locale: $locale, onOpen: profileOpened,
  });
  const { data } = useSuspenseQuery({
    queryKey: ['profile', userId, locale],
    queryFn: () => fetchProfile(userId, locale),
  });
  return { profile: data, onOpen };
}
```

Effector manages application state and events; Query manages server data. Store updates do not automatically invalidate Query: express dependencies through query keys or explicit QueryClient operations.

### Effector Reflect

```tsx
const Profile = pipe(
  ProfileView,
  withHook(useProfilePresentation),
  view => reflect({ view, bind: { userId: $userId, locale: $locale } }),
);
```

Reflect binds the presentation hook's external inputs. Do not subscribe to the same stores a second time inside the hook unless needed. Reflect's `hooks` configuration describes mounted/unmounted callbacks; it is separate from React hooks. See the [complete example](./examples/reflect.tsx).

### Memoization

```tsx
const Profile = pipe(memo(ProfileView), withHook(useProfilePresentation));
```

This memoizes the View: the hook may update while unchanged final prop fields allow the View to skip rendering. A new enclosing props object alone does not break `memo`; new object or function values inside props can.

```tsx
const Profile = memo(withHook(useProfilePresentation)(ProfileView));
```

This memoizes the outer wrapper against parent updates; its own hook updates still run. Context and local state updates follow React's normal rules. No utility automatically memoizes every layer or deeply compares values.

Prefer `pipe(memo(View), ...)` to passing the overloaded `memo` function as an operator: TypeScript can otherwise widen intermediate props. Generic/overloaded third-party HOCs may similarly need an adapter. Memoization is an optimization, not a render-count guarantee.

## TypeScript and limitations

- The compatibility matrix tests TypeScript 5.4.5 and 7.0.2 with React 18 and 19.
- HOCs accept ordinary function/class Views supported by `ComponentType`; asynchronous Server Components are outside the contract.
- Ref forwarding and static-property hoisting are not implemented. External `ref` props are rejected. React 19's ref-as-prop support does not imply cross-version forwarding by these wrappers.
- Do not use `key` or `ref` as ordinary input names. They have React-specific semantics. Injection/mapping of these result keys is rejected by the types.
- Hook-only inputs are forwarded to the View. Do not spread every View prop onto a DOM element; select DOM props explicitly or filter with `mapProps`.
- Generic, overloaded, and polymorphic components may require a concrete typed adapter.
- Internal assertions bridge TypeScript's inability to reconstruct generic prop spreads. Compatibility and emitted-declaration tests cover those seams; consumer `any` and assertions can bypass checks.
- Create enhanced components at module scope and follow the Rules of Hooks. React Compiler and framework-specific lint compatibility are not certified by these tests. In Next.js, compose and use these HOCs in a client module (`"use client"`); there is no Server Component integration.
- Inputs and captured configuration should be immutable. No shared mutable HOC context is used.

## Bundle size

Measured with esbuild 0.25.12, production browser ESM, ES2020, minification, React/ReactDOM external, gzip level 9 and Brotli quality 11. Exported functions are retained, not optimized away as unused application code.

<!-- bundle-sizes:start -->
<!-- Generated by pnpm size:update. Do not edit this table manually. -->
| Export | Minified bytes | Gzip bytes | Brotli bytes |
| --- | ---: | ---: | ---: |
| `withHook` | 196 | 169 | 133 |
| `withStaticProps` | 195 | 165 | 134 |
| `mapProps` | 174 | 154 | 116 |
| `withGuard` | 246 | 190 | 150 |
| `withSuspense` | 272 | 198 | 174 |
| `withErrorBoundary` | 779 | 457 | 386 |
| `withContext` | 208 | 176 | 131 |
| `withWrapper` | 225 | 178 | 142 |
| `pipe` | 583 | 237 | 190 |
| `all HOCs` | 2232 | 792 | 690 |
| `all HOCs + pipe` | 2806 | 971 | 847 |
<!-- bundle-sizes:end -->

These are standalone export sizes, not additive per-call costs. Importing a utility in multiple places does not duplicate its module in a normal shared bundle. Application callbacks, components, providers, and third-party libraries are not included. All-HOC totals benefit from shared compression.

`pnpm size:update` regenerates the table above. `pnpm size` writes exact measurements to `tmp/bundle-sizes.json`. `pnpm test:bundle` checks size budgets, verifies that each barrel import excludes other operators and Effect, and checks subpath parity. Repeat measurements when implementation or tool versions change; this table describes the direct-HOC implementation, not earlier scope/builder experiments.

## Development

```sh
pnpm install
pnpm test
pnpm size
pnpm test:package
```

| Command | Checks |
| --- | --- |
| `pnpm build` | ESM JS, declarations, declaration maps and source maps |
| `pnpm test:types` | Public emitted declarations; positive and `@ts-expect-error` cases |
| `pnpm test:examples` | Complete examples against the public package |
| `pnpm test:runtime` | Prop precedence, composition, state, guards, providers, Suspense and errors |
| `pnpm test:integrations` | Query retry, Reflect bindings, Effector Scope and events |
| `pnpm test:bundle` | Tree shaking, subpath parity and gzip budgets |
| `pnpm test:package` | Packed exports, declarations and a consumer import |
| `pnpm size` | Standalone minified/gzip/Brotli measurements |

`pnpm test` builds and runs types, examples, runtime, integration, and bundle checks. CI runs the compatibility matrix and validates the packed package. No npm publication is performed.

## Further reading and HOC examples

These resources explore the pattern and its tradeoffs; their APIs are independent of this package. Older examples may use class components or library APIs that have since changed.

### Developer blogs

- [Nadia Makarevich — Higher-Order Components in React Hooks era](https://www.developerway.com/posts/higher-order-components-in-react-hooks-era): practical examples of wrapping callbacks with analytics, intercepting DOM events, and passing selected Context values to a memoized View.
- [Robin Wieruch — React Higher-Order Components](https://www.robinwieruch.de/react-higher-order-components/): conditional rendering, configurable HOCs, and composition through small functions.
- [Robin Wieruch — Why React Hooks over HOCs](https://www.robinwieruch.de/react-hooks-higher-order-components/): prop ownership, naming collisions, and dependencies between wrappers; useful guidance for deciding when a custom hook is simpler.
- [Kent C. Dodds — Use react-error-boundary to handle errors in React](https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react): error fallbacks and recovery. Originally written for the library's version 3 API; check its current documentation before copying examples.

### Types and composition rules

- [React TypeScript Cheatsheets — Excluding Props](https://react-typescript-cheatsheet.netlify.app/docs/hoc/excluding_props/): deriving external props after a HOC injects values, including `Omit` and generic compatibility checks.
- [React — Higher-Order Components](https://legacy.reactjs.org/docs/higher-order-components.html): the original guide to composition, prop forwarding, component identity, statics, and refs. This is legacy documentation, useful as a reference for the pattern rather than current React recommendations.

### Library implementations to explore

- [react-i18next — withTranslation](https://react.i18next.com/latest/withtranslation-hoc): injecting translation functions, loading namespaces, and integrating with Suspense.
- [Effector Reflect — reflect](https://reflect.effector.dev/docs/reflect): connecting Views to stores and events, deriving props, and preserving Effector Scope behavior.
- [React Redux — connect](https://redux.js.org/react-redux/api/connect): a detailed example of state selection, prop merging, and configurable equality checks. The current documentation marks `connect` as deprecated and recommends hooks; study it as an established HOC design.
- [Recompose](https://github.com/acdlite/recompose): a historical collection of composable HOCs for props, state, and behavior. Active maintenance was discontinued in favor of hooks; use it for design ideas, not as a new dependency recommendation.
