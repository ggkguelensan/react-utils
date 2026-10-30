import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';

type KeysOfUnion<Value> = Value extends unknown ? keyof Value : never;

type Remaining<Props, Injected> = Props extends unknown
  ? Omit<Props, KeysOfUnion<Injected>>
  : never;

type ExternalProps<Input, Props, Injected> = Input & Remaining<Props, Injected> & {
  // React 18 does not forward refs through a plain function component.
  ref?: never;
};

type Reconstructed<Props, Injected> = Props extends unknown
  ? Remaining<Props, Injected> & Injected
  : never;

type CompatibleView<Props, Injected> = [Reconstructed<Props, Injected>] extends [Props]
  ? unknown
  : never;

type UnsupportedResult = PromiseLike<unknown> | readonly unknown[] | ((...args: never[]) => unknown);
type ValidResult<Injected> = [Extract<Injected, UnsupportedResult>] extends [never]
  ? unknown
  : never;

/**
 * Injects hook results while forwarding the remaining props.
 * Create the HOC at module scope. Injected values win over incoming values.
 */
export const withHook = <Input extends object, Injected extends object>(
  useViewModel: ((props: Input) => Injected) & ValidResult<Injected>,
) => <Props extends object>(
  View: ComponentType<Props> & CompatibleView<Props, Injected>,
): ComponentType<ExternalProps<Input, Props, Injected>> => {
  function WithHook(props: ExternalProps<Input, Props, Injected>): ReactElement {
    const injected = useViewModel(props);
    // TS cannot reconstruct generic Props after removing and reinjecting keys.
    // CompatibleView checks that the merged result satisfies the View contract.
    const viewProps = { ...props, ...injected } as unknown as Props;
    return createElement(View, viewProps);
  }

  WithHook.displayName = `withHook(${View.displayName ?? View.name ?? 'View'})`;
  return WithHook;
};
