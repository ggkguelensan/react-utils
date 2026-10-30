/** Internal prop algebra; not part of the public package exports. */
export type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never;

export type Remaining<Props, Injected> = Props extends unknown
  ? Omit<Props, KeysOfUnion<Injected>>
  : never;

export type NoRef<Props> = Props & { ref?: never };

export type ExternalProps<Input, Props, Injected> = NoRef<Input & Remaining<Props, Injected>>;

type Reconstructed<Props, Injected> = Props extends unknown
  ? Remaining<Props, Injected> & Injected
  : never;

export type CompatibleView<Props, Injected> = [Reconstructed<Props, Injected>] extends [Props]
  ? unknown
  : never;

type UnsupportedResult = PromiseLike<unknown> | readonly unknown[] | ((...args: never[]) => unknown);

export type ValidResult<Value> = [Extract<Value, UnsupportedResult>] extends [never]
  ? Extract<KeysOfUnion<Value>, 'key' | 'ref'> extends never ? unknown : never
  : never;
