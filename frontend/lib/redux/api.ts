import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  CreateInvitationInput,
  Invitation,
  PopulatedInvitation,
  UpdateInvitationInput,
  UpdateInvitationStatusInput,
} from '@/lib/types/invitation';
import type { ProtocolMember } from '@/lib/types/protocol-member';
import type { Assignment } from '@/lib/types/assignment';
import type { CreateMinisterInput, Minister, UpdateMinisterInput } from '@/lib/types/minister';
import type { Event } from '@/lib/types/event';
import type { StatusLog } from '@/lib/types/status-log';

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
  tagTypes: ['Invitation', 'ProtocolMember', 'Assignment', 'Minister', 'Event', 'StatusLog'],
  endpoints: (builder) => ({
    getMinisters: builder.query<Minister[], void>({
      query: () => '/ministers',
      providesTags: (result) =>
        result
          ? [
              ...result.map((minister) => ({ type: 'Minister' as const, id: minister._id })),
              { type: 'Minister' as const, id: 'LIST' },
            ]
          : [{ type: 'Minister' as const, id: 'LIST' }],
    }),

    getMinister: builder.query<Minister, string>({
      query: (id) => `/ministers/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Minister', id }],
    }),

    createMinister: builder.mutation<Minister, CreateMinisterInput>({
      query: (body) => ({ url: '/ministers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Minister', id: 'LIST' }],
    }),

    updateMinister: builder.mutation<Minister, { id: string } & UpdateMinisterInput>({
      query: ({ id, ...body }) => ({ url: `/ministers/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Minister', id },
        { type: 'Minister', id: 'LIST' },
      ],
    }),

    deleteMinister: builder.mutation<void, string>({
      query: (id) => ({ url: `/ministers/${id}`, method: 'DELETE' }),
      // Only the LIST tag, deliberately — the resource is gone, so invalidating its
      // own id tag just triggers a doomed refetch (404) from whichever component was
      // still displaying it in the instant before navigating away.
      invalidatesTags: [{ type: 'Minister', id: 'LIST' }],
    }),

    // Powers the Minister Profile screen's invitation-history section.
    getInvitationsByMinister: builder.query<PopulatedInvitation[], string>({
      query: (ministerId) => `/invitations?minister_id=${ministerId}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map((invitation) => ({ type: 'Invitation' as const, id: invitation._id })),
              { type: 'Invitation' as const, id: 'LIST' },
            ]
          : [{ type: 'Invitation' as const, id: 'LIST' }],
    }),

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

    // Raw ids (never populated) — feeds the create/edit form's default values and the
    // Status Timeline page, which resolves minister/event display names itself via
    // getMinister/getEvent rather than relying on a populated shape here.
    getInvitation: builder.query<Invitation, string>({
      query: (id) => `/invitations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Invitation', id }],
    }),

    createInvitation: builder.mutation<Invitation, CreateInvitationInput>({
      query: (body) => ({ url: '/invitations', method: 'POST', body }),
      invalidatesTags: [{ type: 'Invitation', id: 'LIST' }],
    }),

    updateInvitation: builder.mutation<Invitation, { id: string } & UpdateInvitationInput>({
      query: ({ id, ...body }) => ({ url: `/invitations/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Invitation', id },
        { type: 'Invitation', id: 'LIST' },
      ],
    }),

    deleteInvitation: builder.mutation<void, string>({
      query: (id) => ({ url: `/invitations/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Invitation', id: 'LIST' }],
    }),

    // Append-only per backend/CLAUDE.md — powers the Status Timeline screen.
    getStatusLogsByInvitation: builder.query<StatusLog[], string>({
      query: (invitationId) => `/invitations/${invitationId}/status-logs`,
      providesTags: (_result, _error, invitationId) => [
        { type: 'StatusLog' as const, id: `invitation-${invitationId}` },
      ],
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
        { type: 'StatusLog', id: `invitation-${id}` },
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

    // No Events screens yet (frontend/CLAUDE.md's screen order builds those later) —
    // this list only feeds the event picker on the Invitation create/edit form. Events
    // are created via Swagger (/api/docs) in the meantime.
    getEvents: builder.query<Event[], void>({
      query: () => '/events',
      providesTags: (result) =>
        result
          ? [
              ...result.map((event) => ({ type: 'Event' as const, id: event._id })),
              { type: 'Event' as const, id: 'LIST' },
            ]
          : [{ type: 'Event' as const, id: 'LIST' }],
    }),

    getEvent: builder.query<Event, string>({
      query: (id) => `/events/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Event', id }],
    }),
  }),
});

export const {
  useGetMinistersQuery,
  useGetMinisterQuery,
  useCreateMinisterMutation,
  useUpdateMinisterMutation,
  useDeleteMinisterMutation,
  useGetInvitationsByMinisterQuery,
  useGetCurrentlyHostingQuery,
  useGetInvitationQuery,
  useCreateInvitationMutation,
  useUpdateInvitationMutation,
  useDeleteInvitationMutation,
  useGetStatusLogsByInvitationQuery,
  useUpdateInvitationStatusMutation,
  useGetProtocolMembersQuery,
  useGetAssignmentsByInvitationQuery,
  useGetEventsQuery,
  useGetEventQuery,
} = api;
