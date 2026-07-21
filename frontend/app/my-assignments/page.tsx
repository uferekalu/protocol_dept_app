'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, ClipboardList, RefreshCw, UserRound } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useGetAssignmentsByProtocolMemberQuery, useGetCurrentlyHostingQuery } from '@/lib/redux/api';
import { AssignmentStatusActions } from '@/components/assignment-status-actions';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_TYPE_LABELS } from '@/lib/constants/assignment';
import type { Assignment } from '@/lib/types/assignment';
import type { PopulatedInvitation } from '@/lib/types/invitation';

// My Assignments — brief Section 5 (screen 6) / frontend/CLAUDE.md's screen order,
// step 6: a personal task list scoped to the logged-in protocol member (Phase 5 login,
// replacing the old "Acting as" header picker — same as InvitationCard's status-update
// flow). Mobile-first and large touch targets per frontend/CLAUDE.md's UX bar for
// field-use screens.
export default function MyAssignmentsPage() {
  const { data: currentUser, isLoading: isLoadingUser } = useCurrentUser();
  const {
    data: assignments,
    isLoading: isLoadingAssignments,
    isError,
    error,
    refetch,
  } = useGetAssignmentsByProtocolMemberQuery(currentUser?._id ?? skipToken);
  const { data: invitations } = useGetCurrentlyHostingQuery();

  const invitationById = useMemo(() => {
    const map = new Map<string, PopulatedInvitation>();
    invitations?.forEach((invitation) => map.set(invitation._id, invitation));
    return map;
  }, [invitations]);

  const todo = (assignments ?? []).filter((a) => a.status !== 'COMPLETED');
  const completed = (assignments ?? []).filter((a) => a.status === 'COMPLETED');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <h1 className="text-heading-lg text-foreground">My Assignments</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Your assigned legs across every minister currently being hosted.
      </p>

      {isLoadingUser && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {!isLoadingUser && !currentUser && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <UserRound className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">You&apos;re not logged in</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>{' '}
            to see your assignments.
          </p>
        </EmptyPanel>
      )}

      {currentUser && isLoadingAssignments && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {currentUser && isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load your assignments</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {currentUser && !isLoadingAssignments && !isError && (assignments ?? []).length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <ClipboardList className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No assignments yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Legs assigned to you on the Assignment Board will show up here.
          </p>
        </EmptyPanel>
      )}

      {currentUser && !isLoadingAssignments && !isError && todo.length > 0 && (
        <div className="flex flex-col gap-3">
          {todo.map((assignment) => (
            <AssignmentTaskCard
              key={assignment._id}
              assignment={assignment}
              invitation={invitationById.get(assignment.invitation_id)}
            />
          ))}
        </div>
      )}

      {currentUser && !isLoadingAssignments && !isError && completed.length > 0 && (
        <div className="mt-6">
          <h2 className="text-heading-md mb-3 text-foreground">Completed</h2>
          <div className="flex flex-col gap-2 opacity-70">
            {completed.map((assignment) => (
              <AssignmentTaskCard
                key={assignment._id}
                assignment={assignment}
                invitation={invitationById.get(assignment.invitation_id)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function AssignmentTaskCard({
  assignment,
  invitation,
}: {
  assignment: Assignment;
  invitation?: PopulatedInvitation;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-heading-md text-foreground">
            {ASSIGNMENT_TYPE_LABELS[assignment.assignment_type]}
          </p>
          <p className="text-body-sm text-muted-foreground">
            {invitation
              ? `${invitation.minister_id.full_name} · ${invitation.event_id.name}`
              : 'Invitation no longer active'}
          </p>
        </div>
        <span className="text-label shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
          {ASSIGNMENT_STATUS_LABELS[assignment.status]}
        </span>
      </div>

      <p className="text-body-sm mt-2 text-muted-foreground">
        {new Date(assignment.scheduled_time).toLocaleString()}
      </p>
      {assignment.notes && (
        <p className="text-body-sm mt-1 text-muted-foreground">{assignment.notes}</p>
      )}

      <div className="mt-3">
        <AssignmentStatusActions assignment={assignment} size="lg" />
      </div>
    </div>
  );
}
