import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { PopulatedInvitation, UpdateInvitationStatusInput } from '@/lib/types/invitation';
import type { ProtocolMember } from '@/lib/types/protocol-member';
import type { Assignment } from '@/lib/types/assignment';

// Single RTK Query API slice for all server state, per frontend/CLAUDE.md — "pick RTK
// Query and use it consistently," not a mix of ad hoc fetches. Endpoints are added
// here as each screen needs them, grouped by backend resource.
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api',
  }),
  // A live dashboard should pick up changes another protocol member just made —
  // refetch when the tab regains focus or the connection comes back, on top of the
  // usual tag-based invalidation. Paired with setupListeners(store.dispatch) in
  // store.ts, which is what actually wires up the browser events.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ['Invitation', 'ProtocolMember', 'Assignment'],
  endpoints: (builder) => ({
    getCurrentlyHosting: builder.query<PopulatedInvitation[], void>({
      query: () => '/invitations/currently-hosting',
      providesTags: (result) =>
        result
          ? [
              ...result.map((invitation) => ({ type: 'Invitation' as const, id: invitation._id })),
              { type: 'Invitation' as const, id: 'LIST' },
            ]
          : [{ type: 'Invitation' as const, id: 'LIST' }],
    }),

    updateInvitationStatus: builder.mutation<
      PopulatedInvitation,
      { id: string } & UpdateInvitationStatusInput
    >({
      query: ({ id, ...body }) => ({
        url: `/invitations/${id}/status`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Invitation', id },
        { type: 'Invitation', id: 'LIST' },
      ],
    }),

    getProtocolMembers: builder.query<ProtocolMember[], void>({
      query: () => '/protocol-members',
      providesTags: [{ type: 'ProtocolMember', id: 'LIST' }],
    }),

    getAssignmentsByInvitation: builder.query<Assignment[], string>({
      query: (invitationId) => `/invitations/${invitationId}/assignments`,
      providesTags: (result, _error, invitationId) => [
        { type: 'Assignment' as const, id: `invitation-${invitationId}` },
        ...(result ?? []).map((a) => ({ type: 'Assignment' as const, id: a._id })),
      ],
    }),
  }),
});

export const {
  useGetCurrentlyHostingQuery,
  useUpdateInvitationStatusMutation,
  useGetProtocolMembersQuery,
  useGetAssignmentsByInvitationQuery,
} = api;
