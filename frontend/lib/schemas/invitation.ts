import { z } from 'zod';

// Mirrors backend/src/modules/invitations/dto/create-invitation.dto.ts for instant
// frontend feedback — the backend re-validates everything regardless, per
// frontend/CLAUDE.md. preaching_dates is modeled as an array of objects (not bare
// strings) because react-hook-form's useFieldArray requires object entries.
export const invitationFormSchema = z
  .object({
    minister_id: z.string().min(1, 'Minister is required'),
    event_id: z.string().min(1, 'Event is required'),
    arrival_date: z.string().min(1, 'Arrival date is required'),
    departure_date: z.string().min(1, 'Departure date is required'),
    number_of_days: z.coerce.number().int().min(1, 'Must be at least 1 day'),
    hotel_name: z.string().min(1, 'Hotel name is required'),
    hotel_address: z.string().min(1, 'Hotel address is required'),
    hotel_room_number: z.string().optional(),
    preaching_dates: z.array(z.object({ date: z.string().min(1, 'Date is required') })),
  })
  .refine((data) => data.departure_date >= data.arrival_date, {
    message: 'Departure date must be on or after arrival date',
    path: ['departure_date'],
  })
  .superRefine((data, ctx) => {
    data.preaching_dates.forEach((entry, index) => {
      if (entry.date < data.arrival_date || entry.date > data.departure_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Must fall within the stay',
          path: ['preaching_dates', index, 'date'],
        });
      }
    });
  });

export type InvitationFormValues = z.infer<typeof invitationFormSchema>;
