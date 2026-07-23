import { z } from 'zod';

// Mirrors backend/src/common/validators/password.constants.ts — at least one
// lowercase, one uppercase, one digit, one special character, 6+ chars. Applied
// anywhere a *new* password is being set (signup, change-password); never on login,
// which validates against an already-stored password.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/;
const PASSWORD_REQUIREMENTS_MESSAGE =
  'Must be at least 6 characters and include an uppercase letter, a lowercase letter, a number, and a special character';

const newPasswordField = z.string().regex(PASSWORD_REGEX, PASSWORD_REQUIREMENTS_MESSAGE);

// Mirrors backend/src/modules/auth/dto/login.dto.ts.
export const loginFormSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

// Mirrors backend/src/modules/auth/dto/signup.dto.ts — no role field, the backend
// decides it (first account ever created becomes ADMIN, every one after that MEMBER).
// confirm_password is frontend-only, never sent to the API.
export const signupFormSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required'),
    phone_number: z.string().min(1, 'Phone number is required'),
    password: newPasswordField,
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type SignupFormValues = z.infer<typeof signupFormSchema>;

// /change-password — mirrors backend/src/modules/auth/dto/change-password.dto.ts.
// "Must differ from your current password" is enforced server-side (the frontend has
// no way to know the current password to compare against).
export const changePasswordFormSchema = z
  .object({
    new_password: newPasswordField,
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordFormSchema>;

// /forgot-password step 1 — mirrors backend/src/modules/auth/dto/forgot-password.dto.ts.
export const forgotPasswordFormSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordFormSchema>;

// /forgot-password step 2 — mirrors backend/src/modules/auth/dto/reset-password.dto.ts.
// phone_number isn't a field here (carried over from step 1), just otp + new password.
export const resetPasswordFormSchema = z
  .object({
    otp: z.string().length(6, 'Enter the 6-digit code'),
    new_password: newPasswordField,
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

// /team/[id] self-edit — full_name/phone_number required, email optional. No password
// field — that's the dedicated /change-password page now, not this form.
export const profileFormSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone_number: z.string().min(1, 'Phone number is required'),
  email: z.union([z.string().email('Enter a valid email address'), z.literal('')]).optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
