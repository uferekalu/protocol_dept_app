import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export const AUTH_TOKEN_STORAGE_KEY = 'protocol-department:auth-token';

// Holds only the JWT — the authenticated member's profile is never duplicated here,
// it's just the cached result of useGetCurrentUserQuery() (GET /auth/me), consumed via
// lib/hooks/use-current-user.ts. Persisted to localStorage by whoever sets/clears it
// (the login page, AuthHydrator on mount, and the logout action), same pattern as the
// old sessionSlice/acting-as-picker.tsx it replaces.
interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    clearToken(state) {
      state.token = null;
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;
export default authSlice.reducer;
