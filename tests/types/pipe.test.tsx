import { pipe } from '@ggkguelensan/react-utils/pipe';
type Equal<Left, Right> = (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;
const identity = pipe('hello' as const);
const result = pipe(1, value => value + 1, value => String(value), value => ({ label: value }));
const generic = pipe([1, 2], <Value,>(values: Value[]) => values[0]);
const asyncResult = pipe(1, async value => String(value), promise => promise.then(value => value.length));
// @ts-expect-error adjacent operators must agree
pipe('hello', (value: number) => value + 1);
// @ts-expect-error a failure in the middle of a longer chain remains an error
pipe(1, value => String(value), (value: boolean) => !value, value => String(value));
export type Checks = [
  Expect<Equal<typeof identity, 'hello'>>,
  Expect<Equal<typeof result, { label: string }>>,
  Expect<Equal<typeof generic, number | undefined>>,
  Expect<Equal<typeof asyncResult, Promise<number>>>,
];
