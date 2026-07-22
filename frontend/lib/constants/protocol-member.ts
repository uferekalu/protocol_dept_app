import type { ProtocolMemberRole } from '@/lib/types/protocol-member';

// Mirrors backend/src/common/enums.ts (ProtocolMemberRole).
export const PROTOCOL_MEMBER_ROLE_LABELS: Record<ProtocolMemberRole, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  MEMBER: 'Member',
};
