'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useDeleteMinisterMutation,
  useGetInvitationsByMinisterQuery,
  useGetMinisterQuery,
} from '@/lib/redux/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { MinisterFormDialog } from '@/components/minister-form-dialog';
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

// Minister Profile — brief Section 5 (screen 3): details + invitation history.
export default function MinisterProfilePage() {
  const { id: ministerId } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: minister, isLoading, isError, error, refetch } = useGetMinisterQuery(ministerId);
  const { data: invitations, isLoading: invitationsLoading } =
    useGetInvitationsByMinisterQuery(ministerId);
  const [deleteMinister, { isLoading: isDeleting }] = useDeleteMinisterMutation();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleDelete() {
    try {
      await deleteMinister(ministerId).unwrap();
      toast.success(`${minister?.full_name ?? 'Minister'} deleted`);
      router.push('/ministers');
    } catch {
      toast.error('Could not delete this minister.');
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <Link
        href="/ministers"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Ministers
      </Link>

      {isLoading && <ProfileSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this minister</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This minister no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {minister && (
        <>
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="min-w-0">
              <p className="text-heading-lg text-foreground">{minister.full_name}</p>
              <p className="text-body-sm text-muted-foreground">{minister.title}</p>
              <div className="mt-4 flex flex-col gap-1.5">
                <DetailRow icon={<Phone className="size-4" />}>{minister.phone_number}</DetailRow>
                {minister.email && (
                  <DetailRow icon={<Mail className="size-4" />}>{minister.email}</DetailRow>
                )}
                <DetailRow icon={<MapPin className="size-4" />}>
                  {minister.home_church_or_parish}
                </DetailRow>
              </div>
              {minister.notes && (
                <p className="text-body-sm mt-4 max-w-prose text-muted-foreground">
                  {minister.notes}
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
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
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-heading-md text-foreground">Invitation history</h2>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => router.push(`/invitations/new?minister_id=${ministerId}`)}
            >
              <Plus className="size-4" />
              New Invitation
            </Button>
          </div>

          {invitationsLoading && <Skeleton className="h-20 w-full rounded-xl" />}

          {!invitationsLoading && invitations && invitations.length === 0 && (
            <p className="text-body-sm rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
              No invitations yet for this minister.
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
                      {invitation.event_id.name}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {new Date(invitation.arrival_date).toLocaleDateString()} –{' '}
                      {new Date(invitation.departure_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-label rounded-full bg-primary/10 px-3 py-1 text-primary">
                      {STATUS_LABELS[invitation.status]}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {minister && (
        <MinisterFormDialog open={editOpen} onOpenChange={setEditOpen} minister={minister} />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {minister?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their profile permanently. Past invitations referencing them
              stay in the record but will no longer resolve a name.
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
