'use client';

import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AssignmentFormDialog } from '@/components/assignment-form-dialog';
import { AssignmentStatusActions } from '@/components/assignment-status-actions';
import {
  useDeleteAssignmentMutation,
  useGetAssignmentsByInvitationQuery,
  useGetProtocolMembersQuery,
} from '@/lib/redux/api';
import {
  ASSIGNMENT_STATUS_BADGE_VARIANT,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_TYPE_LABELS,
} from '@/lib/constants/assignment';
import type { PopulatedInvitation } from '@/lib/types/invitation';
import type { Assignment } from '@/lib/types/assignment';

// One card per currently-hosted invitation on the Assignment Board — brief Section 5
// (screen 5). Legs repeat (Hotel <-> Venue recurs once per preaching day, per the
// brief's Section 3 sub-cycle note), so this shows every assignment on the invitation
// as a flat, time-sorted list plus a general "Assign" action, rather than five fixed
// leg-type slots.
export function InvitationAssignmentsCard({ invitation }: { invitation: PopulatedInvitation }) {
  const { data: assignments, isLoading } = useGetAssignmentsByInvitationQuery(invitation._id);
  const { data: members } = useGetProtocolMembersQuery();
  const [deleteAssignment, { isLoading: isDeleting }] = useDeleteAssignmentMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | undefined>(undefined);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | undefined>(undefined);

  function openCreate() {
    setEditingAssignment(undefined);
    setDialogOpen(true);
  }

  function openEdit(assignment: Assignment) {
    setEditingAssignment(assignment);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (!deletingAssignment) return;
    try {
      await deleteAssignment({
        id: deletingAssignment._id,
        invitationId: deletingAssignment.invitation_id,
        protocolMemberId: deletingAssignment.protocol_member_id,
      }).unwrap();
      toast.success('Assignment removed');
      setDeletingAssignment(undefined);
    } catch {
      toast.error('Could not remove this assignment.');
    }
  }

  const sorted = assignments
    ? [...assignments].sort(
        (a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime(),
      )
    : [];

  return (
    <Card>
      <CardHeader>
        <p className="text-heading-md text-foreground">{invitation.minister_id.full_name}</p>
        <p className="text-body-sm text-muted-foreground">{invitation.event_id.name}</p>
        <CardAction>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={openCreate}>
            <Plus className="size-4" />
            Assign
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
        {!isLoading && sorted.length === 0 && (
          <p className="text-body-sm text-muted-foreground">No legs assigned yet.</p>
        )}
        {!isLoading &&
          sorted.map((assignment) => {
            const member = members?.find((m) => m._id === assignment.protocol_member_id);
            return (
              <div key={assignment._id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-foreground">
                      {ASSIGNMENT_TYPE_LABELS[assignment.assignment_type]}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {member?.full_name ?? 'Unknown member'} ·{' '}
                      {new Date(assignment.scheduled_time).toLocaleString()}
                    </p>
                    {assignment.notes && (
                      <p className="text-caption mt-1 text-muted-foreground">
                        {assignment.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      onClick={() => openEdit(assignment)}
                      aria-label="Edit assignment"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingAssignment(assignment)}
                      aria-label="Delete assignment"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={ASSIGNMENT_STATUS_BADGE_VARIANT[assignment.status]}>
                    {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                  </Badge>
                  <AssignmentStatusActions assignment={assignment} size="sm" />
                </div>
              </div>
            );
          })}
      </CardContent>

      <AssignmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        invitationId={invitation._id}
        assignment={editingAssignment}
      />

      <AlertDialog
        open={Boolean(deletingAssignment)}
        onOpenChange={(open) => !open && setDeletingAssignment(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingAssignment &&
                `${ASSIGNMENT_TYPE_LABELS[deletingAssignment.assignment_type]} will no longer have anyone assigned.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Removing…' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
