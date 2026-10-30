import { createContext, memo, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { pipe, withHook, withGuard, withContext, withWrapper, mapProps } from '@ggkguelensan/react-hoc';
const Theme = createContext<'light' | 'dark'>('light');
function Layout(p: PropsWithChildren<{ heading: string }>) { return <section><h1>{p.heading}</h1>{p.children}</section>; }
function View(p: { title: string; theme: string }) { return <p>{p.theme}: {p.title}</p>; }
function usePresentation({ userId }: { userId: string }) { return { title: userId, theme: useContext(Theme) }; }
export const Profile = pipe(
  memo(View),
  mapProps((p: { title: string; theme: string; userId: string }) => ({ title: p.title, theme: p.theme })),
  withHook(usePresentation),
  withGuard((p: { userId: string }) => Boolean(p.userId), { fallback: <p>Select a user</p> }),
  withContext(Theme, () => 'dark'),
  withWrapper(Layout, (p: { heading: string }) => ({ heading: p.heading })),
);
export const example = <Profile userId="123" heading="Profile" />;
