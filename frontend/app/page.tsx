'use client';

import { Users, AlertTriangle } from 'lucide-react';
import { useGetCurrentlyHostingQuery } from '@/lib/redux/api';
import { InvitationCard } from '@/components/invitation-card';
import { Skeleton } from '@/components/ui/skeleton';

// "Currently Hosting" — the live dashboard, brief Section 4B / 5 (screen 1).
export default function Home() {
  const { data: invitations, isLoading, isError, error } = useGetCurrentlyHostingQuery();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-heading-lg text-foreground">Currently Hosting</h1>
        <p className="text-body-sm text-muted-foreground">
          Every minister currently in-stay, their live status, and who&apos;s responsible
          for them right now.
        </p>
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <p className="text-body font-medium text-foreground">Couldn&apos;t load the dashboard</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && invitations && invitations.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card py-16 text-center">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-body font-medium text-foreground">No one is currently being hosted</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Invitations show up here from the moment a minister is invited until they&apos;ve
            departed.
          </p>
        </div>
      )}

      {!isLoading && !isError && invitations && invitations.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invitations.map((invitation) => (
            <InvitationCard key={invitation._id} invitation={invitation} />
          ))}
        </div>
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-1.5 w-full" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}
