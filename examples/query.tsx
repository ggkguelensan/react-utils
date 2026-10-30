import { useQuery } from '@tanstack/react-query';
import { withHook } from '@ggkguelensan/react-hoc';
import { fetchProfile, ProfileError, ProfileSkeleton } from './shared.js';
import type { Profile } from './shared.js';

// A stable selector transforms successful data without changing the cached Profile.
function selectProfileName(profile: Profile) { return profile.name; }

export function useProfilePresentation({ userId }: { userId: string }) {
  const { data: name, isPending, error, refetch } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
    select: selectProfileName,
  });
  return { name, isPending, error, refetch };
}

type ProfileViewProps = {
  name: string | undefined;
  isPending: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

function ProfileView({ name, isPending, error, refetch }: ProfileViewProps) {
  if (isPending) return <ProfileSkeleton />;
  if (error) return <ProfileError error={error} onRetry={() => { void refetch(); }} />;
  return <article>{name}</article>;
}
export const ProfileComponent = withHook(useProfilePresentation)(ProfileView);
// Render under QueryClientProvider. The example chooses an error screen even for a failed background refetch.
