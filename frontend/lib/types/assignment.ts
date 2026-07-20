// Mirrors backend/src/common/enums.ts (AssignmentType, AssignmentStatus) and
// backend/src/modules/assignments/schemas/assignment.schema.ts + its DTOs.
export type AssignmentType =
  | 'AIRPORT_PICKUP'
  | 'DROP_TO_HOTEL'
  | 'HOTEL_TO_VENUE'
  | 'VENUE_TO_HOTEL'
  | 'DEPARTURE_DROP_OFF';

export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Assignment {
  _id: string;
  invitation_id: string;
  protocol_member_id: string;
  assignment_type: AssignmentType;
  scheduled_time: string;
  // Only ever set by the backend when status moves to COMPLETED.
  actual_time_completed?: string;
  status: AssignmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  invitation_id: string;
  protocol_member_id: string;
  assignment_type: AssignmentType;
  scheduled_time: string;
  notes?: string;
}

// Deliberately excludes `status`/`actual_time_completed` — see
// UpdateAssignmentStatusInput below.
export type UpdateAssignmentInput = Partial<CreateAssignmentInput>;

export interface UpdateAssignmentStatusInput {
  status: AssignmentStatus;
  notes?: string;
}
