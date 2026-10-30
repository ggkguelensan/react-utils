import { createEvent, createStore, fork } from 'effector';
import { Provider, useUnit } from 'effector-react';
import { withHook } from '@ggkguelensan/react-hoc';
export const incrementClicked = createEvent();
export const $count = createStore(0, { sid: 'counter/count' }).on(incrementClicked, value => value + 1);
function CounterView(p: { count: number; increment: () => void }) {
  return <button onClick={p.increment}>{p.count}</button>;
}
export function useCounterPresentation() { return useUnit({ count: $count, increment: incrementClicked }); }
export const Counter = withHook(useCounterPresentation)(CounterView);
// A browser-only example. SSR applications create a Scope per request.
const scope = fork();
export function App() { return <Provider value={scope}><Counter /></Provider>; }
