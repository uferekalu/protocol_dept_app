import { z } from 'zod';

// Mirrors backend/src/modules/auth/dto/login.dto.ts.
export const loginFormSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
