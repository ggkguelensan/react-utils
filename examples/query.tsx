import { useQuery } from '@tanstack/react-query';
import { withHook } from '@ggkguelensan/react-hoc';
import { fetchProfile, ProfileCard, ProfileError, ProfileSkeleton } from './shared.js';
import type { Profile } from './shared.js';
type ProfileState =
  | { status: 'pending' }
  | { status: 'error'; error: Error; retry: () => void }
  | { status: 'success'; profile: Profile };
export function useProfilePresentation({ userId }: { userId: string }): { state: ProfileState } {
  const query = useQuery({ queryKey: ['profile', userId], queryFn: () => fetchProfile(userId) });
  if (query.isPending) return { state: { status: 'pending' } };
  if (query.isError) return { state: { status: 'error', error: query.error, retry: () => { void query.refetch(); } } };
  return { state: { status: 'success', profile: query.data } };
}
function ProfileView({ state }: { state: ProfileState }) {
  switch (state.status) {
    case 'pending': return <ProfileSkeleton />;
    case 'error': return <ProfileError error={state.error} onRetry={state.retry} />;
    case 'success': return <ProfileCard profile={state.profile} />;
  }
}
export const ProfileComponent = withHook(useProfilePresentation)(ProfileView);
// Render under QueryClientProvider. The example chooses an error screen even for a failed background refetch.
