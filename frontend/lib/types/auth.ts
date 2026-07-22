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

export interface LoginResponse {
  access_token: string;
  protocol_member: AuthenticatedProtocolMember;
}
