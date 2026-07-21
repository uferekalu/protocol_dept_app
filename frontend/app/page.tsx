'use client';

import { Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { useGetCurrentlyHostingQuery } from '@/lib/redux/api';
import { InvitationCard } from '@/components/invitation-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// "Currently Hosting" — the live dashboard, brief Section 4B / 5 (screen 1).
export default function Home() {
  const { data: invitations, isLoading, isError, error, refetch } = useGetCurrentlyHostingQuery();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mb-8">
        <div>
          <h1 className="text-heading-lg text-foreground">Currently Hosting</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Every minister currently in-stay, their live status, and who&apos;s responsible
            for them right now.
          </p>
        </div>
        {!isLoading && !isError && invitations && invitations.length > 0 && (
          <span className="text-label rounded-full bg-primary/10 px-3 py-1 text-primary">
            {invitations.length} hosted
          </span>
        )}
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the dashboard</p>
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
            Invitations show up here the moment a minister is invited, and stay until
            they&apos;ve departed.
          </p>
        </EmptyPanel>
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

// Shared shell for the empty/error states: a soft brand-colored glow behind an icon
// badge, rather than a bare gray icon on a blank box — this is the screen a
// newly-set-up department sees most often, so it earns real visual treatment.
function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative overflow-hidden rounded-2xl border border-border bg-card py-16 text-center motion-safe:duration-500 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-4 px-6">{children}</div>
    </div>
  );
}

function IconBadge({ tone, children }: { tone: 'primary' | 'destructive'; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === 'primary'
          ? 'flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20'
          : 'flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20'
      }
    >
      {children}
    </div>
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
