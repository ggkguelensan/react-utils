export type Profile = { id: string; name: string };
export async function fetchProfile(userId: string, locale = 'en'): Promise<Profile> {
  const response = await fetch(`/api/profiles/${encodeURIComponent(userId)}?locale=${encodeURIComponent(locale)}`);
  if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
  return response.json() as Promise<Profile>;
}
export function ProfileCard({ profile }: { profile: Profile }) { return <article>{profile.name}</article>; }
export function ProfileSkeleton() { return <p role="status">Loading profile…</p>; }
export function ProfileError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <div role="alert"><p>{error instanceof Error ? error.message : String(error)}</p><button onClick={onRetry}>Retry</button></div>;
}
