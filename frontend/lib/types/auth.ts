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

// Deliberately has no `role` field — every self-service signup becomes a MEMBER,
// mirrors backend/src/modules/auth/dto/signup.dto.ts.
export interface SignupInput {
  full_name: string;
  phone_number: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  protocol_member: AuthenticatedProtocolMember;
}
