import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import type { NoRef, ValidResult } from './internal/props-types.js';

/** Replaces all View props. The mapper is pure and must not call hooks. */
export const mapProps = <Input extends object, Output extends object>(
  select: ((props: Input) => Output) & ValidResult<Output>,
) => <Props extends object>(
  View: ComponentType<Props> & ([Output] extends [Props] ? unknown : never),
): ComponentType<NoRef<Input>> => {
  function MapProps(props: NoRef<Input>): ReactElement {
    return createElement(View, select(props) as unknown as Props);
  }
  MapProps.displayName = `mapProps(${View.displayName ?? View.name ?? 'View'})`;
  return MapProps;
};
