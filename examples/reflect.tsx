import { createStore } from 'effector';
import { reflect } from '@effector/reflect';
import { useSuspenseQuery } from '@tanstack/react-query';
import { pipe, withHook, withSuspense, withWrapper } from '@ggkguelensan/react-hoc';
import { QueryBoundary } from './suspense-query.js';
import { fetchProfile, ProfileCard, ProfileSkeleton } from './shared.js';
export const $userId = createStore('123', { sid: 'profile/id' });
export const $locale = createStore('en', { sid: 'profile/locale' });
function useProfilePresentation({ userId, locale }: { userId: string; locale: string }) {
  const { data } = useSuspenseQuery({ queryKey: ['profile', userId, locale], queryFn: () => fetchProfile(userId, locale) });
  return { profile: data };
}
export const ProfileComponent = pipe(
  ProfileCard,
  withHook(useProfilePresentation),
  withSuspense({ fallback: <ProfileSkeleton /> }),
  withWrapper(QueryBoundary),
  view => reflect({ view, bind: { userId: $userId, locale: $locale } }),
);
// Render below QueryClientProvider and, when using Fork API, Effector Provider.
