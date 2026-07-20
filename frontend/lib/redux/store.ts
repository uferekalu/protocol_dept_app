import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';

// Register feature slices here as they're built (ministersSlice, invitationsSlice,
// assignmentsSlice, authSlice, etc.) per docs/PROTOCOL_APP_BRIEF.md.
export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
