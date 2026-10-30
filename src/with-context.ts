import { createElement } from 'react';
import type { ComponentType, Context, ContextType } from 'react';
import type { NoRef } from './internal/props-types.js';

type ResolverInput<Resolver extends (props: never) => unknown> =
  Parameters<Resolver> extends [] ? object : Parameters<Resolver>[0];

/** Resolves a Provider value from external props. The resolver must not call hooks. */
export const withContext = <
  ProviderContext extends Context<any>,
  Resolver extends (props: never) => ContextType<ProviderContext>,
>(
  context: ProviderContext,
  // Capture the resolver itself to retain contextual literal returns inside pipe on TS 5.4.
  select: Resolver & (ResolverInput<Resolver> extends object ? unknown : never),
) => <Props extends object>(View: ComponentType<Props>): ComponentType<NoRef<ResolverInput<Resolver> & Props>> => {
  function WithContext(props: NoRef<ResolverInput<Resolver> & Props>) {
    return createElement(context.Provider, { value: select(props as never) }, createElement(View, props));
  }
  WithContext.displayName = `withContext(${View.displayName ?? View.name ?? 'View'})`;
  return WithContext;
};
