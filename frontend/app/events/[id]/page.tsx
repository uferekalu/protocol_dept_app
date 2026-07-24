'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarRange,
  ChevronRight,
  Download,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteEventMutation,
  useGetEventQuery,
  useGetInvitationsByEventQuery,
  useLazyExportInvitationsByEventQuery,
} from '@/lib/redux/api';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isElevatedRole } from '@/lib/constants/protocol-member';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Badge } from '@/components/ui/badge';
import { EventFormDialog } from '@/components/event-form-dialog';
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

// Event Detail — brief Section 5 (screen 8): details + which ministers are invited to
// this event. Mirrors the Minister Profile screen's shape (details card + a linked
// list below it), just from the other side of the Invitation relationship.
export default function EventDetailPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: event, isLoading, isError, error, refetch } = useGetEventQuery(eventId);
  const { data: invitations, isLoading: invitationsLoading } =
    useGetInvitationsByEventQuery(eventId);
  const [deleteEvent, { isLoading: isDeleting }] = useDeleteEventMutation();
  const [exportInvitations, { isFetching: isExporting }] = useLazyExportInvitationsByEventQuery();
  const { data: currentUser } = useCurrentUser();
  const canManage = isElevatedRole(currentUser?.role);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteEvent(eventId).unwrap();
      toast.success(`${event?.name ?? 'Event'} deleted`);
      router.push('/events');
    } catch {
      toast.error('Could not delete this event.');
    }
  }

  // Triggers a browser download of the CSV text RTK Query already fetched (with the
  // Authorization header attached) — a plain <a href> can't carry that header, so the
  // file has to be fetched via JS first and then handed to the browser as a Blob.
  async function handleExport() {
    try {
      const { csv, filename } = await exportInvitations(eventId).unwrap();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the minister list.');
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        href="/events"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Events
      </Link>

      {isLoading && <ProfileSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this event</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This event no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {event && (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="min-w-0">
              <p className="text-heading-lg text-foreground">{event.name}</p>
              <div className="mt-4 flex flex-col gap-1.5">
                <DetailRow icon={<CalendarRange className="size-4" />}>
                  {new Date(event.start_date).toLocaleDateString()} –{' '}
                  {new Date(event.end_date).toLocaleDateString()}
                </DetailRow>
                <DetailRow icon={<MapPin className="size-4" />}>{event.venue}</DetailRow>
              </div>
              {event.description && (
                <p className="text-body-sm mt-4 max-w-prose text-muted-foreground">
                  {event.description}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || invitationsLoading || !invitations?.length}
                className="gap-1.5"
              >
                <Download className="size-4" />
                {isExporting ? 'Exporting…' : 'Export CSV'}
              </Button>
              {canManage && (
                <>
                  <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5">
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
                </>
              )}
            </div>
          </div>

          <h2 className="text-heading-md mb-3 text-foreground">Invited ministers</h2>

          {invitationsLoading && <Skeleton className="h-20 w-full rounded-xl" />}

          {!invitationsLoading && invitations && invitations.length === 0 && (
            <p className="text-body-sm rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No ministers invited to this event yet.
            </p>
          )}

          {!invitationsLoading && invitations && invitations.length > 0 && (
            <div className="flex flex-col gap-2">
              {invitations.map((invitation) => (
                <Link
                  key={invitation._id}
                  href={`/invitations/${invitation._id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 hover:border-primary/40"
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium text-foreground">
                      {invitation.minister_id.full_name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {new Date(invitation.arrival_date).toLocaleDateString()} –{' '}
                      {new Date(invitation.departure_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{STATUS_LABELS[invitation.status]}</Badge>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {event && <EventFormDialog open={editOpen} onOpenChange={setEditOpen} event={event} />}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {event?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the event permanently. Past invitations referencing it stay in
              the record but will no longer resolve a name.
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

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
