import { skipToken } from '@reduxjs/toolkit/query/react';
import { useAppSelector } from '@/lib/redux/hooks';
import { useGetCurrentUserQuery } from '@/lib/redux/api';

// The one place every screen should ask "who's logged in" — skips the GET /auth/me
// call entirely when there's no token yet (no point round-tripping to a 401), and
// stays in sync automatically once one exists (via the token in Redux, hydrated by
// AuthGuard) or is cleared (login, logout, or the auto-logout-on-401 in
// lib/redux/api.ts).
export function useCurrentUser() {
  const token = useAppSelector((state) => state.auth.token);
  return useGetCurrentUserQuery(token ? undefined : skipToken);
}
