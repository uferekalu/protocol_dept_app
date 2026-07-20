// Mirrors backend/src/common/enums.ts (InvitationStatus) and
// backend/src/modules/invitations/schemas/invitation.schema.ts + its DTOs.
export type InvitationStatus =
  | 'INVITED'
  | 'AIRPORT_PICKUP_IN_PROGRESS'
  | 'EN_ROUTE_TO_HOTEL'
  | 'CHECKED_IN_AT_HOTEL'
  | 'EN_ROUTE_TO_VENUE'
  | 'AT_VENUE_MINISTERING'
  | 'RETURNED_TO_HOTEL'
  | 'EN_ROUTE_TO_DEPARTURE_POINT'
  | 'DEPARTED_TRIP_COMPLETED';

export interface Invitation {
  _id: string;
  minister_id: string;
  event_id: string;
  arrival_date: string;
  departure_date: string;
  number_of_days: number;
  hotel_name: string;
  hotel_address: string;
  hotel_room_number?: string;
  preaching_dates: string[];
  status: InvitationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvitationInput {
  minister_id: string;
  event_id: string;
  arrival_date: string;
  departure_date: string;
  number_of_days?: number;
  hotel_name: string;
  hotel_address: string;
  hotel_room_number?: string;
  preaching_dates?: string[];
}

// Deliberately excludes `status` — see UpdateInvitationStatusInput below.
export type UpdateInvitationInput = Partial<CreateInvitationInput>;

export interface UpdateInvitationStatusInput {
  status: InvitationStatus;
  // Stand-in for the authenticated user until Phase 5 auth exists.
  updated_by: string;
  notes?: string;
}
