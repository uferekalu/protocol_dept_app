import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Stand-in for real auth until Phase 5 exists. Every action that needs to know "who
// is doing this" (e.g. PATCH /invitations/:id/status's required updated_by) reads
// from here instead of a JWT-derived session. See components/acting-as-picker.tsx,
// which is the only place this gets written, and localStorage persistence there.
interface SessionState {
  actingAsId: string | null;
}

const initialState: SessionState = {
  actingAsId: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setActingAs(state, action: PayloadAction<string | null>) {
      state.actingAsId = action.payload;
    },
  },
});

export const { setActingAs } = sessionSlice.actions;
export default sessionSlice.reducer;
