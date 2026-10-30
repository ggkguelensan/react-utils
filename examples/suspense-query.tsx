import { useState } from 'react';
import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider, QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { pipe, withHook, withSuspense, withWrapper } from '@ggkguelensan/react-hoc';
import { fetchProfile, ProfileCard, ProfileError, ProfileSkeleton } from './shared.js';
export function QueryBoundary({ children }: PropsWithChildren) {
  return <QueryErrorResetBoundary>{({ reset }) =>
    <ErrorBoundary onReset={reset} fallbackRender={({ error, resetErrorBoundary }) =>
      <ProfileError error={error} onRetry={resetErrorBoundary} />}>{children}</ErrorBoundary>
  }</QueryErrorResetBoundary>;
}
export function useProfilePresentation({ userId }: { userId: string }) {
  const { data } = useSuspenseQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  return { profile: data };
}
export const ProfileComponent = pipe(
  ProfileCard, withHook(useProfilePresentation),
  withSuspense({ fallback: <ProfileSkeleton /> }), withWrapper(QueryBoundary),
);
export function App() {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}><ProfileComponent userId="123" /></QueryClientProvider>;
}
