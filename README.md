# react-utils

TypeScript utilities for composing React Views with hooks. This repository is not published to npm.

## Development

```sh
pnpm install
pnpm test
```

`pnpm test:types` builds the package and checks the emitted declarations with `tsc --noEmit`. Positive cases assert inferred types; negative cases use `@ts-expect-error`, so a lost error fails the suite. Runtime tests cover prop forwarding, precedence, hooks, and composition order.

CI checks TypeScript 5.4.5/7.0.2 with React 18/19. Reflect and TanStack Query are development-only dependencies used in integration type tests.

## `pipe`

`pipe` is a direct re-export of `effect/Function`, preserving its checked overloads. Operators compose left to right; there is no custom untyped fallback. It does not implicitly await promises.

```ts
import { pipe } from '@ggkguelensan/react-utils';

const label = pipe(1, value => value + 1, value => String(value));
```

## `withHook`

A hook synchronously returns a plain object supplying some View props. The remaining View props pass through; the hook's own inputs become external requirements. The View does not have to declare hook-only inputs. Promises, arrays, functions, and primitive hook results are rejected.

```tsx
import { useState } from 'react';
import type { ReactElement } from 'react';
import { pipe, withHook } from '@ggkguelensan/react-utils';

function CounterView(props: {
  count: number;
  increment: () => void;
  label: string;
}): ReactElement {
  return <button onClick={props.increment}>{props.label}: {props.count}</button>;
}

const Counter = pipe(
  CounterView,
  withHook(({ initial }: { initial: number }) => {
    const [count, setCount] = useState(initial);
    return { count, increment: () => setCount(value => value + 1) };
  }),
);

<Counter initial={0} label="Tickets" />;
// count/increment are supplied by the hook; label passes through.
```

The transformation is:

```text
External props = Hook inputs & (View props minus injected keys)

View:        count, increment, label
Hook input:  initial
Hook output: count, increment
External:    initial, label
```

The output must be compatible with the View. An optional value cannot fill a required prop. Discriminated unions are preserved; every injected union branch must be safe. Same-named input/output props can intentionally transform values, such as `{ value: string } → { value: number }`.

### Multiple HOCs and dependent hooks

```tsx
const Enhanced = pipe(
  View,
  withHook(useTitle),
  withHook(useSubtitle),
);
```

Each HOC removes the props it supplies and retains the remaining requirements. Component construction proceeds left to right, but render execution proceeds outside in: `useSubtitle`, then `useTitle`.

When one hook needs another hook's result, combine them explicitly:

```tsx
withHook(({ eventId }: { eventId: number }) => {
  const event = useEvent(eventId);
  const title = useEventTitle(event);
  return { title };
});
```

Create enhanced components at module scope. Follow the Rules of Hooks, including a fixed unconditional call order.

### Reflect and Query

Both of these patterns have type tests:

```tsx
pipe(View, withHook(usePresentation), view => reflect({
  view,
  bind: { eventId: $eventId },
}));

pipe(View, withHook((props: { locale: string }) => {
  const eventId = useUnit($eventId);
  const { data } = useQuery({
    ...eventQO({ eventId, locale: props.locale }),
    select: response => response.name,
  });
  return { title: data };
}));
```

Return a small props object from the hook. Returning/spreading the entire Query result reads all its properties when React constructs View props, broadening tracked subscriptions. Types cannot guarantee render counts or correct API responses.

### Scope

- ESM exports: package root, `/pipe`, and `/with-hook`.
- Hook results override incoming props at runtime. Injected-only keys are removed from the external TypeScript API; keys that are also explicit hook inputs remain valid inputs.
- Hook inputs are forwarded to the View along with other incoming props. Avoid blindly spreading all View props onto DOM elements.
- Generic/overloaded hooks may need a concrete typed adapter to retain the intended relationship between input and output.
- Ref forwarding and hoisting View statics are not implemented. External `ref` props are rejected by the types. Do not use `key` or `ref` as ordinary hook input names.
- There is one internal assertion bridging generic prop merging. Public compatibility checks and declaration tests cover that boundary; explicit `any` or consumer assertions can bypass TypeScript checks.
