'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUpdateAssignmentStatusMutation } from '@/lib/redux/api';
import {
  ASSIGNMENT_STATUS_ACTION_LABELS,
  VALID_ASSIGNMENT_TRANSITIONS,
} from '@/lib/constants/assignment';
import type { Assignment, AssignmentStatus } from '@/lib/types/assignment';

// Shared guarded status-advance control — used on both the Assignment Board (compact,
// coordinator view) and My Assignments (large touch targets, field use), per
// frontend/CLAUDE.md's mobile-first UX bar for status-update screens. Backend still
// re-validates every transition; this only reflects VALID_ASSIGNMENT_TRANSITIONS so the
// UI never offers a move the API would reject.
export function AssignmentStatusActions({
  assignment,
  size = 'sm',
}: {
  assignment: Assignment;
  size?: 'sm' | 'lg';
}) {
  const [updateStatus, { isLoading }] = useUpdateAssignmentStatusMutation();
  const nextStatuses = VALID_ASSIGNMENT_TRANSITIONS[assignment.status];

  async function handleAdvance(next: AssignmentStatus) {
    try {
      await updateStatus({ id: assignment._id, status: next }).unwrap();
      toast.success(ASSIGNMENT_STATUS_ACTION_LABELS[next]);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not update this assignment.');
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-caption text-muted-foreground">Completed</p>;
  }

  return (
    <div className={size === 'lg' ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2'}>
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size={size === 'lg' ? 'lg' : 'sm'}
          variant={next === 'COMPLETED' ? 'default' : 'outline'}
          onClick={() => handleAdvance(next)}
          disabled={isLoading}
          className={size === 'lg' ? 'h-11 flex-1 text-body font-semibold' : ''}
        >
          {ASSIGNMENT_STATUS_ACTION_LABELS[next]}
        </Button>
      ))}
    </div>
  );
}
