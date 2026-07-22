'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { skipToken } from '@reduxjs/toolkit/query/react';
import { AlertTriangle, ArrowLeft, CalendarClock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteInvitationMutation,
  useGetEventQuery,
  useGetInvitationQuery,
  useGetMinisterQuery,
  useGetProtocolMembersQuery,
  useGetStatusLogsByInvitationQuery,
} from '@/lib/redux/api';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isElevatedRole } from '@/lib/constants/protocol-member';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { InvitationCard } from '@/components/invitation-card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { STATUS_LABELS } from '@/lib/constants/invitation-status';
import type { PopulatedInvitation } from '@/lib/types/invitation';

// Status Timeline — brief Section 5 (screen 7) / frontend/CLAUDE.md's screen order,
// step 4: the append-only StatusLog history, most recent first, plus the same
// stepper + advance-status action as the Dashboard card so a coordinator can act
// without leaving this screen.
export default function InvitationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const {
    data: invitation,
    isLoading: invitationLoading,
    isError,
    error,
    refetch,
  } = useGetInvitationQuery(id);
  const { data: minister } = useGetMinisterQuery(invitation?.minister_id ?? skipToken);
  const { data: event } = useGetEventQuery(invitation?.event_id ?? skipToken);
  const { data: statusLogs, isLoading: logsLoading } = useGetStatusLogsByInvitationQuery(id);
  const { data: members } = useGetProtocolMembersQuery();
  const [deleteInvitation, { isLoading: isDeleting }] = useDeleteInvitationMutation();
  const { data: currentUser } = useCurrentUser();
  const canManage = isElevatedRole(currentUser?.role);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const populatedInvitation: PopulatedInvitation | undefined =
    invitation && minister && event
      ? { ...invitation, minister_id: minister, event_id: event }
      : undefined;

  async function handleDelete() {
    if (!invitation) return;
    try {
      await deleteInvitation(invitation._id).unwrap();
      toast.success('Invitation deleted');
      router.push(`/ministers/${invitation.minister_id}`);
    } catch {
      toast.error('Could not delete this invitation.');
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <Link
        href={invitation ? `/ministers/${invitation.minister_id}` : '/ministers'}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to minister
      </Link>

      {(invitationLoading || logsLoading) && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
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

      {populatedInvitation && invitation && (
        <div className="flex flex-col gap-6">
          {canManage && (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/invitations/${invitation._id}/edit`)}
                className="gap-1.5"
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteOpen(true)}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          )}

          <InvitationCard invitation={populatedInvitation} />

          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-heading-md mb-3 text-foreground">Stay details</h2>
            <div className="flex flex-col gap-2">
              <DetailRow icon={<CalendarClock className="size-4" />}>
                {new Date(invitation.arrival_date).toLocaleDateString()} –{' '}
                {new Date(invitation.departure_date).toLocaleDateString()} (
                {invitation.number_of_days} {invitation.number_of_days === 1 ? 'day' : 'days'})
              </DetailRow>
              <DetailRow icon={<MapPin className="size-4" />}>
                {invitation.hotel_name}, {invitation.hotel_address}
                {invitation.hotel_room_number ? ` — Room ${invitation.hotel_room_number}` : ''}
              </DetailRow>
            </div>
            {invitation.preaching_dates.length > 0 && (
              <div className="mt-4">
                <p className="text-label mb-1.5 text-muted-foreground">Preaching dates</p>
                <div className="flex flex-wrap gap-1.5">
                  {invitation.preaching_dates.map((date) => (
                    <span
                      key={date}
                      className="text-caption rounded-full bg-primary/10 px-2.5 py-1 text-primary"
                    >
                      {new Date(date).toLocaleDateString()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-heading-md mb-3 text-foreground">Status timeline</h2>
            {statusLogs && statusLogs.length > 0 ? (
              <div className="flex flex-col gap-2">
                {statusLogs.map((log) => (
                  <div
                    key={log._id}
                    className="flex flex-col gap-0.5 rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-body font-medium text-foreground">
                        {STATUS_LABELS[log.status]}
                      </p>
                      <p className="text-caption text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-body-sm text-muted-foreground">
                      {members?.find((m) => m._id === log.updated_by)?.full_name ?? 'Unknown member'}
                    </p>
                    {log.notes && (
                      <p className="text-body-sm mt-1 text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body-sm rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                No status changes recorded yet.
              </p>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invitation and its status timeline. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="text-body-sm flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
