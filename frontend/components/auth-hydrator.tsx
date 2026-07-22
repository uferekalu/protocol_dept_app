'use client';

import { useEffect } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, setToken } from '@/lib/redux/slices/authSlice';

// Hydrates the JWT from localStorage on mount only — mirrors the previous
// acting-as-picker.tsx's approach (client-side only, avoids an SSR/hydration
// mismatch — the server has no localStorage to read). Renders nothing; exists purely
// for the effect, rendered once in app/providers.tsx.
export function AuthHydrator() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (stored) dispatch(setToken(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
