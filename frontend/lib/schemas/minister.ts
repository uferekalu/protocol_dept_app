import { z } from 'zod';

// Mirrors backend/src/modules/ministers/dto/create-minister.dto.ts for instant
// frontend feedback — the backend re-validates everything regardless, per
// frontend/CLAUDE.md.
export const ministerFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  title: z.string().min(1, 'Title is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([z.string().email('Enter a valid email address'), z.literal('')]).optional(),
  home_church_or_parish: z.string().min(1, 'Home church or parish is required'),
  photo: z.string().optional(),
  notes: z.string().optional(),
});

export type MinisterFormValues = z.infer<typeof ministerFormSchema>;
