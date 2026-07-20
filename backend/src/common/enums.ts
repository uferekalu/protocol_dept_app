// Shared enums for the Protocol Department app.
// These map directly to docs/PROTOCOL_APP_BRIEF.md Sections 2 and 3.
// Do not rename values without updating the brief and the frontend types together.

export enum InvitationStatus {
  INVITED = 'INVITED',
  AIRPORT_PICKUP_IN_PROGRESS = 'AIRPORT_PICKUP_IN_PROGRESS',
  EN_ROUTE_TO_HOTEL = 'EN_ROUTE_TO_HOTEL',
  CHECKED_IN_AT_HOTEL = 'CHECKED_IN_AT_HOTEL',
  EN_ROUTE_TO_VENUE = 'EN_ROUTE_TO_VENUE',
  AT_VENUE_MINISTERING = 'AT_VENUE_MINISTERING',
  RETURNED_TO_HOTEL = 'RETURNED_TO_HOTEL',
  EN_ROUTE_TO_DEPARTURE_POINT = 'EN_ROUTE_TO_DEPARTURE_POINT',
  DEPARTED_TRIP_COMPLETED = 'DEPARTED_TRIP_COMPLETED',
}

// Valid forward transitions. EN_ROUTE_TO_VENUE / AT_VENUE_MINISTERING / RETURNED_TO_HOTEL
// form a repeating sub-cycle for each preaching day before eventually moving on to
// EN_ROUTE_TO_DEPARTURE_POINT. Enforce this map server-side when updating status.
export const VALID_STATUS_TRANSITIONS: Record<InvitationStatus, InvitationStatus[]> = {
  [InvitationStatus.INVITED]: [InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS],
  [InvitationStatus.AIRPORT_PICKUP_IN_PROGRESS]: [InvitationStatus.EN_ROUTE_TO_HOTEL],
  [InvitationStatus.EN_ROUTE_TO_HOTEL]: [InvitationStatus.CHECKED_IN_AT_HOTEL],
  [InvitationStatus.CHECKED_IN_AT_HOTEL]: [InvitationStatus.EN_ROUTE_TO_VENUE],
  [InvitationStatus.EN_ROUTE_TO_VENUE]: [InvitationStatus.AT_VENUE_MINISTERING],
  [InvitationStatus.AT_VENUE_MINISTERING]: [InvitationStatus.RETURNED_TO_HOTEL],
  // From RETURNED_TO_HOTEL, the minister either goes out for another preaching
  // engagement (back to EN_ROUTE_TO_VENUE) or the stay is over (EN_ROUTE_TO_DEPARTURE_POINT).
  [InvitationStatus.RETURNED_TO_HOTEL]: [
    InvitationStatus.EN_ROUTE_TO_VENUE,
    InvitationStatus.EN_ROUTE_TO_DEPARTURE_POINT,
  ],
  [InvitationStatus.EN_ROUTE_TO_DEPARTURE_POINT]: [
    InvitationStatus.DEPARTED_TRIP_COMPLETED,
  ],
  [InvitationStatus.DEPARTED_TRIP_COMPLETED]: [],
};

export enum ProtocolMemberRole {
  ADMIN = 'ADMIN',
  COORDINATOR = 'COORDINATOR',
  MEMBER = 'MEMBER', // driver/escort
}

export enum AssignmentType {
  AIRPORT_PICKUP = 'AIRPORT_PICKUP',
  DROP_TO_HOTEL = 'DROP_TO_HOTEL',
  HOTEL_TO_VENUE = 'HOTEL_TO_VENUE',
  VENUE_TO_HOTEL = 'VENUE_TO_HOTEL',
  DEPARTURE_DROP_OFF = 'DEPARTURE_DROP_OFF',
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

// Valid forward transitions for an Assignment's status. COMPLETED is terminal — once a
// leg is marked done, it's not reopened. Enforce this map server-side when updating
// status, same as VALID_STATUS_TRANSITIONS above.
export const VALID_ASSIGNMENT_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  [AssignmentStatus.PENDING]: [AssignmentStatus.IN_PROGRESS, AssignmentStatus.COMPLETED],
  [AssignmentStatus.IN_PROGRESS]: [AssignmentStatus.COMPLETED],
  [AssignmentStatus.COMPLETED]: [],
};
