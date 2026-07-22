'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, setToken } from '@/lib/redux/slices/authSlice';
import { useHasMounted } from '@/lib/hooks/use-has-mounted';

// Every screen requires a logged-in session except these — auth pages themselves, plus
// the placeholder forgot-password page (see app/forgot-password/page.tsx).
const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password'];

// Replaces the old AuthHydrator: hydration (reading the token from localStorage) and
// the redirect-to-login check must live in the SAME component. Splitting them across
// two components let the redirect check run with token still `null` before
// hydration's dispatch(setToken(...)) had propagated, wrongly bouncing an
// already-logged-in user to /login on every hard refresh. `hydrated` is
// useHasMounted() rather than a local useState — see that hook's comment for why (avoids
// the extra cascading render a raw useState setter in an effect would cause).
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppSelector((state) => state.auth.token);
  const hydrated = useHasMounted();

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (stored) dispatch(setToken(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !isPublicRoute) {
      router.replace('/login');
    }
  }, [hydrated, token, isPublicRoute, router]);

  if (!hydrated) return null;
  if (!token && !isPublicRoute) return null;

  return <>{children}</>;
}
