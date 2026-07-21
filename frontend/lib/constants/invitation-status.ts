import type { InvitationStatus } from '@/lib/types/invitation';
import type { AssignmentType } from '@/lib/types/assignment';

// Mirrors backend/src/common/enums.ts (InvitationStatus, VALID_STATUS_TRANSITIONS).
// Duplicated deliberately, same as the type unions in lib/types/*.ts — the backend
// remains the source of truth and re-validates every transition regardless of what
// this offers in the UI. Keep in sync by hand if the brief's Section 3 pipeline
// changes.
export const STATUS_ORDER: InvitationStatus[] = [
  'INVITED',
  'AIRPORT_PICKUP_IN_PROGRESS',
  'EN_ROUTE_TO_HOTEL',
  'CHECKED_IN_AT_HOTEL',
  'EN_ROUTE_TO_VENUE',
  'AT_VENUE_MINISTERING',
  'RETURNED_TO_HOTEL',
  'EN_ROUTE_TO_DEPARTURE_POINT',
  'DEPARTED_TRIP_COMPLETED',
];

// Human-readable label per status — never render the raw SCREAMING_SNAKE_CASE value.
export const STATUS_LABELS: Record<InvitationStatus, string> = {
  INVITED: 'Invited',
  AIRPORT_PICKUP_IN_PROGRESS: 'Airport Pickup In Progress',
  EN_ROUTE_TO_HOTEL: 'En Route to Hotel',
  CHECKED_IN_AT_HOTEL: 'Checked In at Hotel',
  EN_ROUTE_TO_VENUE: 'En Route to Venue',
  AT_VENUE_MINISTERING: 'At Venue / Ministering',
  RETURNED_TO_HOTEL: 'Returned to Hotel',
  EN_ROUTE_TO_DEPARTURE_POINT: 'En Route to Departure',
  DEPARTED_TRIP_COMPLETED: 'Departed / Trip Completed',
};

// Same repeating sub-cycle as the backend's VALID_STATUS_TRANSITIONS: from
// RETURNED_TO_HOTEL, the minister either goes out for another preaching engagement
// or the stay is over.
export const VALID_STATUS_TRANSITIONS: Record<InvitationStatus, InvitationStatus[]> = {
  INVITED: ['AIRPORT_PICKUP_IN_PROGRESS'],
  AIRPORT_PICKUP_IN_PROGRESS: ['EN_ROUTE_TO_HOTEL'],
  EN_ROUTE_TO_HOTEL: ['CHECKED_IN_AT_HOTEL'],
  CHECKED_IN_AT_HOTEL: ['EN_ROUTE_TO_VENUE'],
  EN_ROUTE_TO_VENUE: ['AT_VENUE_MINISTERING'],
  AT_VENUE_MINISTERING: ['RETURNED_TO_HOTEL'],
  RETURNED_TO_HOTEL: ['EN_ROUTE_TO_VENUE', 'EN_ROUTE_TO_DEPARTURE_POINT'],
  EN_ROUTE_TO_DEPARTURE_POINT: ['DEPARTED_TRIP_COMPLETED'],
  DEPARTED_TRIP_COMPLETED: [],
};

// Action-oriented button copy for each possible *next* status — what a protocol
// member taps, not the raw status name they're moving to.
export const STATUS_ACTION_LABELS: Record<InvitationStatus, string> = {
  INVITED: 'Mark as Invited',
  AIRPORT_PICKUP_IN_PROGRESS: 'Start Airport Pickup',
  EN_ROUTE_TO_HOTEL: 'Mark Picked Up',
  CHECKED_IN_AT_HOTEL: 'Mark Checked In',
  EN_ROUTE_TO_VENUE: 'Send to Venue',
  AT_VENUE_MINISTERING: 'Mark Arrived at Venue',
  RETURNED_TO_HOTEL: 'Mark Returned to Hotel',
  EN_ROUTE_TO_DEPARTURE_POINT: 'Send to Departure',
  DEPARTED_TRIP_COMPLETED: 'Mark Departed',
};

// Which assignment type is "responsible right now" for a given status — used to
// resolve the Dashboard card's assigned-member field. RETURNED_TO_HOTEL is
// deliberately unmapped: it's a fork (another preaching engagement or the stay is
// over) with no single correct answer, so the UI shows "Unassigned" honestly rather
// than guessing.
export const STATUS_TO_ASSIGNMENT_TYPE: Partial<Record<InvitationStatus, AssignmentType>> = {
  INVITED: 'AIRPORT_PICKUP',
  AIRPORT_PICKUP_IN_PROGRESS: 'AIRPORT_PICKUP',
  EN_ROUTE_TO_HOTEL: 'DROP_TO_HOTEL',
  CHECKED_IN_AT_HOTEL: 'HOTEL_TO_VENUE',
  EN_ROUTE_TO_VENUE: 'HOTEL_TO_VENUE',
  AT_VENUE_MINISTERING: 'VENUE_TO_HOTEL',
  EN_ROUTE_TO_DEPARTURE_POINT: 'DEPARTURE_DROP_OFF',
  DEPARTED_TRIP_COMPLETED: 'DEPARTURE_DROP_OFF',
};
