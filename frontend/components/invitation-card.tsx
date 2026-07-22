'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusStepper } from '@/components/status-stepper';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useGetAssignmentsByInvitationQuery,
  useGetProtocolMembersQuery,
  useUpdateInvitationStatusMutation,
} from '@/lib/redux/api';
import {
  STATUS_ACTION_LABELS,
  STATUS_TO_ASSIGNMENT_TYPE,
  VALID_STATUS_TRANSITIONS,
} from '@/lib/constants/invitation-status';
import type { PopulatedInvitation, InvitationStatus } from '@/lib/types/invitation';
import type { Assignment } from '@/lib/types/assignment';

// "Who's responsible right now" isn't a single stored field — an invitation can have
// several assignments across its stay. Resolve it from the current status's mapped
// assignment_type, preferring an in-progress leg, then the soonest still-pending one,
// then falling back to the most recently completed one so the card still shows
// *something* useful. Returns null when there's genuinely no single right answer
// (see STATUS_TO_ASSIGNMENT_TYPE's comment on RETURNED_TO_HOTEL) or nothing matches.
function resolveResponsibleAssignment(
  assignments: Assignment[] | undefined,
  status: InvitationStatus,
): Assignment | null {
  const type = STATUS_TO_ASSIGNMENT_TYPE[status];
  if (!type || !assignments) return null;

  const matching = assignments.filter((a) => a.assignment_type === type);

  const active = matching.find((a) => a.status === 'IN_PROGRESS');
  if (active) return active;

  const pending = matching
    .filter((a) => a.status === 'PENDING')
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
  if (pending[0]) return pending[0];

  const completed = matching
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime());
  return completed[0] ?? null;
}

export function InvitationCard({ invitation }: { invitation: PopulatedInvitation }) {
  const { data: currentUser } = useCurrentUser();
  const { data: assignments } = useGetAssignmentsByInvitationQuery(invitation._id);
  const { data: members } = useGetProtocolMembersQuery();
  const [updateStatus, { isLoading: isUpdating }] = useUpdateInvitationStatusMutation();

  const responsible = useMemo(
    () => resolveResponsibleAssignment(assignments, invitation.status),
    [assignments, invitation.status],
  );
  const responsibleMember = members?.find((m) => m._id === responsible?.protocol_member_id);

  const nextStatuses = VALID_STATUS_TRANSITIONS[invitation.status];

  async function handleAdvance(nextStatus: InvitationStatus) {
    if (!currentUser) {
      toast.error('Log in to update status.');
      return;
    }
    try {
      await updateStatus({
        id: invitation._id,
        status: nextStatus,
        updated_by: currentUser._id,
      }).unwrap();
      toast.success(`${invitation.minister_id.full_name}: ${STATUS_ACTION_LABELS[nextStatus]}`);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update status. Please try again.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="text-heading-md text-foreground">{invitation.minister_id.full_name}</p>
        <p className="text-body-sm text-muted-foreground">{invitation.event_id.name}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <StatusStepper status={invitation.status} />

        <p className="text-body-sm">
          <span className="text-label text-muted-foreground">Responsible: </span>
          <span className="font-medium text-foreground">
            {responsibleMember ? responsibleMember.full_name : 'Unassigned'}
          </span>
        </p>

        {nextStatuses.length > 0 ? (
          // Full-width, stacked — not side-by-side flex-wrap — per frontend/CLAUDE.md's
          // "big, unambiguous primary actions" and mobile-first status-update UX. h-11
          // (44px) is a real touch target, still a plain Tailwind spacing-scale value.
          <div className="flex flex-col gap-2">
            {nextStatuses.map((next) => (
              <Button
                key={next}
                size="lg"
                onClick={() => handleAdvance(next)}
                disabled={isUpdating || !currentUser}
                className="h-11 text-body font-semibold"
              >
                {STATUS_ACTION_LABELS[next]}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-caption text-muted-foreground">Trip completed.</p>
        )}
        {!currentUser && nextStatuses.length > 0 && (
          <p className="text-caption text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>{' '}
            to update status.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
