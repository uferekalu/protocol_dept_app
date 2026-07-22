// Mirrors backend/src/modules/protocol-members/schemas/protocol-member.schema.ts and its
// DTOs. password_hash is intentionally absent — the API never returns it (see the
// schema's toJSON transform).
export type ProtocolMemberRole = 'ADMIN' | 'COORDINATOR' | 'MEMBER';

export interface ProtocolMember {
  _id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  image_url?: string;
  role: ProtocolMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProtocolMemberInput {
  full_name: string;
  phone_number: string;
  email?: string;
  image_url?: string;
  role: ProtocolMemberRole;
  password: string;
}

// No `password` — changing a password goes through the dedicated
// PATCH /auth/change-password (see lib/types/auth.ts's ChangePasswordInput) instead of
// the general profile update, mirroring UpdateProtocolMemberDto on the backend.
export type UpdateProtocolMemberInput = Partial<Omit<CreateProtocolMemberInput, 'password'>>;
