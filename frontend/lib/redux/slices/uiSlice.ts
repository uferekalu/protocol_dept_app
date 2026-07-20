import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Example slice covering small global UI state (sidebar open/closed, active filters,
// etc). Feature-specific state (ministers, invitations, assignments) should get their
// own slices alongside this one, e.g. slices/invitationsSlice.ts, or be handled via
// RTK Query if you set that up for server-state caching instead.
interface UiState {
  sidebarOpen: boolean;
}

const initialState: UiState = {
  sidebarOpen: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { setSidebarOpen, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
