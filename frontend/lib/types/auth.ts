// Mirrors backend/src/modules/auth — LoginDto, AuthService's LoginResult and
// AuthenticatedProtocolMember.
import type { ProtocolMemberRole } from './protocol-member';

export interface AuthenticatedProtocolMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: ProtocolMemberRole;
}

export interface LoginInput {
  phone_number: string;
  password: string;
}

// Deliberately has no `role` field — the caller never gets to choose it. The first
// account ever created becomes ADMIN, every one after that a MEMBER (see
// backend/src/modules/auth/auth.service.ts's signup()).
export interface SignupInput {
  full_name: string;
  phone_number: string;
  password: string;
}

// Mirrors backend/src/modules/auth/dto/change-password.dto.ts — no current_password
// (see that DTO's comment), no confirm_password (frontend-only concern).
export interface ChangePasswordInput {
  new_password: string;
}

export interface LoginResponse {
  access_token: string;
  protocol_member: AuthenticatedProtocolMember;
}

// Mirrors backend/src/modules/auth/dto/forgot-password.dto.ts. Always resolves the
// same way whether or not the phone number has an account — see that endpoint's
// comment — so there is no response body to model beyond "it succeeded."
export interface ForgotPasswordInput {
  phone_number: string;
}

// Mirrors backend/src/modules/auth/dto/reset-password.dto.ts. No confirm_password
// (frontend-only concern, same as ChangePasswordInput above).
export interface ResetPasswordInput {
  phone_number: string;
  otp: string;
  new_password: string;
}
