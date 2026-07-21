import type { AssignmentStatus, AssignmentType } from '@/lib/types/assignment';

// Mirrors backend/src/common/enums.ts (AssignmentType, AssignmentStatus,
// VALID_ASSIGNMENT_TRANSITIONS). Duplicated deliberately, same as
// lib/constants/invitation-status.ts — the backend remains the source of truth and
// re-validates every transition regardless of what this offers in the UI.

// Fixed leg order for a trip, per brief Section 2 — used to lay out the Assignment
// Board's five leg slots per invitation in a consistent order.
export const ASSIGNMENT_TYPE_ORDER: AssignmentType[] = [
  'AIRPORT_PICKUP',
  'DROP_TO_HOTEL',
  'HOTEL_TO_VENUE',
  'VENUE_TO_HOTEL',
  'DEPARTURE_DROP_OFF',
];

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  AIRPORT_PICKUP: 'Airport Pickup',
  DROP_TO_HOTEL: 'Drop to Hotel',
  HOTEL_TO_VENUE: 'Hotel → Venue',
  VENUE_TO_HOTEL: 'Venue → Hotel',
  DEPARTURE_DROP_OFF: 'Departure Drop-off',
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

// COMPLETED is terminal — once a leg is marked done, it's not reopened.
export const VALID_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  PENDING: ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
};

// Action-oriented button copy for each possible *next* status, per assignment-status —
// what a protocol member taps on "My Assignments", not the raw status name.
export const ASSIGNMENT_STATUS_ACTION_LABELS: Record<AssignmentStatus, string> = {
  PENDING: 'Mark Pending',
  IN_PROGRESS: 'Start',
  COMPLETED: 'Mark Completed',
};
