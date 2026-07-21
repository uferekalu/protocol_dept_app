import { z } from 'zod';

// Mirrors backend/src/modules/assignments/dto/create-assignment.dto.ts for instant
// frontend feedback — the backend re-validates everything regardless, per
// frontend/CLAUDE.md. scheduled_time holds a <input type="datetime-local"> value
// (no timezone suffix); converted to a real ISO string at submit time.
export const assignmentFormSchema = z.object({
  assignment_type: z.enum(
    ['AIRPORT_PICKUP', 'DROP_TO_HOTEL', 'HOTEL_TO_VENUE', 'VENUE_TO_HOTEL', 'DEPARTURE_DROP_OFF'],
    { message: 'Leg type is required' },
  ),
  protocol_member_id: z.string().min(1, 'Protocol member is required'),
  scheduled_time: z.string().min(1, 'Scheduled time is required'),
  notes: z.string().optional(),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
