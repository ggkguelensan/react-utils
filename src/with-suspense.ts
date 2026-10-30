import { createElement, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import type { NoRef } from './internal/props-types.js';

/** Adds a Suspense boundary outside the View. */
export const withSuspense = <Input extends object = object>(options: {
  fallback: ReactNode | ((props: Input) => ReactNode);
}) => <Props extends object>(View: ComponentType<Props>): ComponentType<NoRef<Input & Props>> => {
  function WithSuspense(props: NoRef<Input & Props>) {
    const fallback = typeof options.fallback === 'function' ? options.fallback(props) : options.fallback;
    return createElement(Suspense, { fallback }, createElement(View, props));
  }
  WithSuspense.displayName = `withSuspense(${View.displayName ?? View.name ?? 'View'})`;
  return WithSuspense;
};
