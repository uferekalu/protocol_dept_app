import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import { api } from './api';

// Register feature slices here as they're built (invitationsSlice, etc. for
// client/UI-only state) per docs/PROTOCOL_APP_BRIEF.md. Server state goes through the
// single RTK Query `api` slice instead, per frontend/CLAUDE.md.
export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

// Enables refetchOnFocus/refetchOnReconnect — appropriate for a live dashboard that
// should pick up changes another protocol member just made.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
