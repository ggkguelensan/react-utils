import { reflect } from '@effector/reflect';
import { createStore } from 'effector';
import { useUnit } from 'effector-react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import type { ComponentProps, ReactElement } from 'react';
import { pipe, withHook } from '@ggkguelensan/react-utils';

function CountView(props: { count: number | undefined; label: string }): ReactElement {
  return <span>{props.label}{props.count}</span>;
}

const $eventId = createStore(1);
const withCount = withHook((props: { eventId: number; locale: string }) => {
  const { data } = useQuery({
    queryKey: ['count', props.eventId, props.locale],
    queryFn: async () => ({ count: 1, ignored: 'metadata' }),
    select: response => response.count,
  });
  return { count: data };
});
const Count = pipe(
  CountView,
  withCount,
  view => reflect({ view, bind: { eventId: $eventId } }),
);
<Count locale="ru" label="Offers" />;
// @ts-expect-error unbound hook input remains required after reflect
<Count label="Offers" />;
// @ts-expect-error unrelated View prop remains required
<Count locale="ru" />;
// @ts-expect-error injected count is not an external prop
<Count locale="ru" label="Offers" count={1} />;
// @ts-expect-error bound store must match the hook input
pipe(CountView, withCount, view => reflect({ view, bind: { eventId: createStore('wrong') } }));
// @ts-expect-error Query data includes undefined before the first success
withCount((props: { count: number; label: string }) => <span>{props.count}</span>);

const Infinite = pipe(
  CountView,
  withHook((props: { locale: string }) => {
    const eventId = useUnit($eventId);
    const { data } = useInfiniteQuery({
      queryKey: ['offers', eventId, props.locale],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => ({ count: pageParam + 1 }),
      getNextPageParam: () => undefined,
      select: resource => resource.pages[0]?.count,
    });
    return { count: data };
  }),
);
<Infinite locale="ru" label="Offers" />;
// @ts-expect-error required Query input remains required
<Infinite label="Offers" />;

type IsAny<Value> = 0 extends (1 & Value) ? true : false;
type Expect<Value extends false> = Value;
export type Checks = [
  Expect<IsAny<ComponentProps<typeof Count>>>,
  Expect<IsAny<ComponentProps<typeof Count>['locale']>>,
  Expect<IsAny<ComponentProps<typeof Infinite>>>,
];
