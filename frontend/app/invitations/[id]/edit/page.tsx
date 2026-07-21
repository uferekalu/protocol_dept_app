'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useGetInvitationQuery } from '@/lib/redux/api';
import { InvitationForm } from '@/components/invitation-form';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';

// Invitation edit — frontend/CLAUDE.md's screen order, step 3.
export default function EditInvitationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: invitation, isLoading, isError, error, refetch } = useGetInvitationQuery(id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href={`/invitations/${id}`}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <h1 className="text-heading-lg mb-1 text-foreground">Edit invitation</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Update the event link, dates, hotel details, or preaching schedule.
      </p>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this invitation</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This invitation no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {invitation && <InvitationForm invitation={invitation} />}
    </main>
  );
}
