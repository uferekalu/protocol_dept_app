'use client';

import { AlertTriangle, RefreshCw, Users } from 'lucide-react';
import { useGetCurrentlyHostingQuery } from '@/lib/redux/api';
import { InvitationAssignmentsCard } from '@/components/invitation-assignments-card';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RequireElevatedRole } from '@/components/require-elevated-role';

// Assignment Board — brief Section 5 (screen 5) / frontend/CLAUDE.md's screen order,
// step 5. Scoped to currently-hosted invitations (same set as the Dashboard) since
// assigning trip legs for a departed/completed invitation isn't actionable.
// ADMIN/COORDINATOR-only, same as the backend (its data comes from endpoints that are
// ADMIN/COORDINATOR-gated) — the "Assignments" nav link is hidden from a MEMBER, but
// this guard also covers anyone who reaches the URL directly.
export default function AssignmentsPage() {
  const { data: invitations, isLoading, isError, error, refetch } = useGetCurrentlyHostingQuery();

  return (
    <RequireElevatedRole>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mb-8">
          <div>
            <h1 className="text-heading-lg text-foreground">Assignment Board</h1>
            <p className="text-body-sm max-w-2xl text-muted-foreground">
              Assign protocol members to each leg of a trip — airport pickup, hotel drop,
              daily transport, and departure.
            </p>
          </div>
          {!isLoading && !isError && invitations && invitations.length > 0 && (
            <Badge>{invitations.length} hosted</Badge>
          )}
        </div>

        {isLoading && <BoardSkeleton />}

        {isError && (
          <EmptyPanel>
            <IconBadge tone="destructive">
              <AlertTriangle className="size-7" />
            </IconBadge>
            <p className="text-heading-md text-foreground">Couldn&apos;t load the board</p>
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

        {!isLoading && !isError && invitations && invitations.length === 0 && (
          <EmptyPanel>
            <IconBadge tone="primary">
              <Users className="size-7" />
            </IconBadge>
            <p className="text-heading-md text-foreground">No one is currently being hosted</p>
            <p className="text-body-sm max-w-sm text-muted-foreground">
              Assignments show up here once a minister has an active invitation.
            </p>
          </EmptyPanel>
        )}

        {!isLoading && !isError && invitations && invitations.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {invitations.map((invitation) => (
              <InvitationAssignmentsCard key={invitation._id} invitation={invitation} />
            ))}
          </div>
        )}
      </main>
    </RequireElevatedRole>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
}
