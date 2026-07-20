// Mirrors backend/src/modules/protocol-members/schemas/protocol-member.schema.ts and its
// DTOs. password_hash is intentionally absent — the API never returns it (see the
// schema's toJSON transform).
export type ProtocolMemberRole = 'ADMIN' | 'COORDINATOR' | 'MEMBER';

export interface ProtocolMember {
  _id: string;
  full_name: string;
  phone_number: string;
  role: ProtocolMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProtocolMemberInput {
  full_name: string;
  phone_number: string;
  role: ProtocolMemberRole;
  password: string;
}

export type UpdateProtocolMemberInput = Partial<CreateProtocolMemberInput>;
