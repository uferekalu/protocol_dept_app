import { z } from 'zod';

// Mirrors backend/src/modules/auth/dto/login.dto.ts.
export const loginFormSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

// Mirrors backend/src/modules/auth/dto/signup.dto.ts — no role field, every signup
// becomes a MEMBER server-side regardless of what's sent.
export const signupFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type SignupFormValues = z.infer<typeof signupFormSchema>;

// /team/[id] self-edit — full_name/phone_number required, password optional (leave
// blank to keep the current one). Mirrors UpdateProtocolMemberDto minus `role`, which
// never appears in the self-edit form (see frontend/CLAUDE.md's screen notes).
export const profileFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.union([z.string().min(8, 'Password must be at least 8 characters'), z.literal('')]),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
