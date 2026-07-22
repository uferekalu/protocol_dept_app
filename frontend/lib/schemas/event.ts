import { z } from 'zod';

// Mirrors backend/src/modules/events/dto/create-event.dto.ts for instant frontend
// feedback — the backend re-validates everything regardless, per frontend/CLAUDE.md.
export const eventFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    venue: z.string().min(1, 'Venue is required'),
    description: z.string().optional(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'End date must be on or after start date',
    path: ['end_date'],
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;
