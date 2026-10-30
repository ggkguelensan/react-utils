import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { CompatibleView, NoRef, Remaining, ValidResult } from './internal/props-types.js';

/** Fixes props at composition time. Fixed values win over incoming values. */
export const withStaticProps = <const Fixed extends object>(values: Fixed & ValidResult<Fixed>) =>
  <Props extends object>(View: ComponentType<Props> & CompatibleView<Props, Fixed>):
  ComponentType<NoRef<Remaining<Props, Fixed>>> => {
    function WithStaticProps(props: NoRef<Remaining<Props, Fixed>>): ReactElement {
      return createElement(View, { ...props, ...values } as unknown as Props);
    }
    WithStaticProps.displayName = `withStaticProps(${View.displayName ?? View.name ?? 'View'})`;
    return WithStaticProps;
  };
