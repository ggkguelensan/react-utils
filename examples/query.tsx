import { useQuery } from '@tanstack/react-query';
import { withHook } from '@ggkguelensan/react-hoc';
import { fetchProfile, ProfileError, ProfileSkeleton } from './shared.js';

export function useProfilePresentation({ userId }: { userId: string }) {
  const { data: name, isPending, error, refetch } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
    select: profile => profile.name,
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
