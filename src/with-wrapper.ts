import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { KeysOfUnion, NoRef, ValidResult } from './internal/props-types.js';

type Wrapped<Input extends object> = <Props extends object>(View: ComponentType<Props>) =>
  ComponentType<NoRef<Input & Props>>;

export function withWrapper<WrapperProps extends object>(
  Wrapper: ComponentType<WrapperProps> & ([{ children: ReactElement }] extends [WrapperProps] ? unknown : never),
): Wrapped<object>;
export function withWrapper<WrapperProps extends object, Input extends object, Output extends object>(
  Wrapper: ComponentType<WrapperProps> & ([Output & { children: ReactElement }] extends [WrapperProps] ? unknown : never),
  select: ((props: Input) => Output) & ValidResult<Output> & ('children' extends KeysOfUnion<Output> ? never : unknown),
): Wrapped<Input>;
/** Adds a wrapper with library-owned children, preserving incoming View props. */
export function withWrapper<WrapperProps extends object, Input extends object, Output extends object>(
  Wrapper: ComponentType<WrapperProps>,
  select?: (props: Input) => Output,
): Wrapped<Input> {
  return <Props extends object>(View: ComponentType<Props>) => {
    function WithWrapper(props: NoRef<Input & Props>) {
      const wrapperProps = { ...select?.(props), children: createElement(View, props) };
      return createElement(Wrapper, wrapperProps as unknown as WrapperProps);
    }
    WithWrapper.displayName = `withWrapper(${View.displayName ?? View.name ?? 'View'})`;
    return WithWrapper;
  };
}
