import { createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { NoRef } from './internal/props-types.js';

/** Conditionally mounts the View; does not narrow the View's prop types. */
export const withGuard = <Input extends object>(
  predicate: (props: Input) => boolean,
  options: { fallback?: ReactNode | ((props: Input) => ReactNode) } = {},
) => <Props extends object>(View: ComponentType<Props>): ComponentType<NoRef<Input & Props>> => {
  function WithGuard(props: NoRef<Input & Props>) {
    if (predicate(props)) return createElement(View, props);
    return typeof options.fallback === 'function' ? options.fallback(props) : options.fallback ?? null;
  }
  WithGuard.displayName = `withGuard(${View.displayName ?? View.name ?? 'View'})`;
  return WithGuard;
};
