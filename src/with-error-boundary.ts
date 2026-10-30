import { Component, createElement } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import type { NoRef } from './internal/props-types.js';

type BoundaryOptions<Input> = {
  fallback: ReactNode | ((error: unknown, reset: () => void, props: Input) => ReactNode);
  onError?: (error: unknown, info: ErrorInfo, props: Input) => void;
  onReset?: (props: Input) => void;
};

type BoundaryState = { failed: boolean; error: unknown };

/** Adds an error boundary; reset calls onReset before retrying the child tree. */
export const withErrorBoundary = <Input extends object = object>(options: BoundaryOptions<Input>) =>
  <Props extends object>(View: ComponentType<Props>): ComponentType<NoRef<Input & Props>> => {
    type External = NoRef<Input & Props>;
    class WithErrorBoundary extends Component<External, BoundaryState> {
      static displayName = `withErrorBoundary(${View.displayName ?? View.name ?? 'View'})`;
      state: BoundaryState = { failed: false, error: undefined };

      static getDerivedStateFromError(error: unknown): BoundaryState {
        return { failed: true, error };
      }

      componentDidCatch(error: Error, info: ErrorInfo): void {
        options.onError?.(error, info, this.props);
      }

      reset = (): void => {
        options.onReset?.(this.props);
        this.setState({ failed: false, error: undefined });
      };

      render(): ReactNode {
        if (this.state.failed) {
          return typeof options.fallback === 'function'
            ? options.fallback(this.state.error, this.reset, this.props)
            : options.fallback;
        }
        return createElement(View, this.props);
      }
    }
    return WithErrorBoundary;
  };
