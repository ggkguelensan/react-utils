import { useState } from 'react';
import { pipe, withHook, withStaticProps } from '@ggkguelensan/react-hoc';
export function CounterView(p: { count: number; increment: () => void; label: string }) {
  return <button onClick={p.increment}>{p.label}: {p.count}</button>;
}
export function useCounter({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  return { count, increment: () => setCount(value => value + 1) };
}
export const Counter = pipe(CounterView, withHook(useCounter));
export const TicketCounter = pipe(Counter, withStaticProps({ label: 'Tickets' }));
export const example = <TicketCounter initial={0} />;
