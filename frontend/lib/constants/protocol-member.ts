import type { ProtocolMemberRole } from '@/lib/types/protocol-member';

// Mirrors backend/src/common/enums.ts (ProtocolMemberRole).
export const PROTOCOL_MEMBER_ROLE_LABELS: Record<ProtocolMemberRole, string> = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coordinator',
  MEMBER: 'Member',
};

// ADMIN and COORDINATOR have identical create/edit/delete privileges on Minister,
// Event, Invitation, and Assignment (backend/CLAUDE.md's Auth & roles section) — the
// only thing COORDINATOR can't do is change a ProtocolMember's role. Every screen that
// hides an Add/Edit/Delete control from a plain MEMBER checks this, mirroring the
// backend's @Roles(ADMIN, COORDINATOR) guards so the UI doesn't show an action the API
// will reject.
export function isElevatedRole(role: ProtocolMemberRole | undefined): boolean {
  return role === 'ADMIN' || role === 'COORDINATOR';
}
