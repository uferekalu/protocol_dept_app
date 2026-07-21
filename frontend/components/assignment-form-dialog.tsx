'use client';

import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { assignmentFormSchema, type AssignmentFormValues } from '@/lib/schemas/assignment';
import {
  useCreateAssignmentMutation,
  useGetProtocolMembersQuery,
  useUpdateAssignmentMutation,
} from '@/lib/redux/api';
import { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPE_ORDER } from '@/lib/constants/assignment';
import { toDatetimeLocalValue } from '@/lib/utils';
import type { Assignment, AssignmentType } from '@/lib/types/assignment';

interface AssignmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invitationId: string;
  // Present => edit/reassign mode, prefilled with this assignment's current values.
  assignment?: Assignment;
}

const EMPTY_VALUES: AssignmentFormValues = {
  assignment_type: 'AIRPORT_PICKUP',
  protocol_member_id: '',
  scheduled_time: '',
  notes: '',
};

// Quick-add dialog, same pattern as components/minister-form-dialog.tsx — a focused,
// single-purpose action (assign or reassign one leg of one invitation's trip), not a
// multi-section page like the Invitation form.
export function AssignmentFormDialog({
  open,
  onOpenChange,
  invitationId,
  assignment,
}: AssignmentFormDialogProps) {
  const isEdit = Boolean(assignment);
  const { data: members, isLoading: membersLoading } = useGetProtocolMembersQuery();
  const [createAssignment, { isLoading: isCreating }] = useCreateAssignmentMutation();
  const [updateAssignment, { isLoading: isUpdating }] = useUpdateAssignmentMutation();
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      assignment
        ? {
            assignment_type: assignment.assignment_type,
            protocol_member_id: assignment.protocol_member_id,
            scheduled_time: toDatetimeLocalValue(assignment.scheduled_time),
            notes: assignment.notes ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, assignment, reset]);

  const sortedMembers = useMemo(
    () => (members ? [...members].sort((a, b) => a.full_name.localeCompare(b.full_name)) : []),
    [members],
  );

  const assignmentType = useWatch({ control, name: 'assignment_type' });
  const protocolMemberId = useWatch({ control, name: 'protocol_member_id' });

  async function onSubmit(values: AssignmentFormValues) {
    const payload = {
      assignment_type: values.assignment_type,
      protocol_member_id: values.protocol_member_id,
      scheduled_time: new Date(values.scheduled_time).toISOString(),
      notes: values.notes || undefined,
    };

    try {
      if (isEdit && assignment) {
        await updateAssignment({ id: assignment._id, ...payload }).unwrap();
        toast.success('Assignment updated');
      } else {
        await createAssignment({ invitation_id: invitationId, ...payload }).unwrap();
        toast.success('Assignment created');
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string | string[] })?.message
          : undefined;
      toast.error(
        Array.isArray(message) ? message.join(', ') : (message ?? 'Something went wrong.'),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Reassign leg' : 'Assign a leg'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Change who's responsible, reschedule, or update notes."
              : 'Assign a protocol member to one leg of this trip.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Field label="Leg" error={errors.assignment_type?.message}>
            <Select
              value={assignmentType}
              onValueChange={(value) =>
                setValue('assignment_type', value as AssignmentType, { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                {/* Resolve the label explicitly — a bare SelectValue shows the raw
                    enum key, not the human-readable leg name. */}
                <SelectValue>
                  {(value: AssignmentType | null) =>
                    (value && ASSIGNMENT_TYPE_LABELS[value]) ?? 'Select a leg'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPE_ORDER.map((type) => (
                  <SelectItem key={type} value={type}>
                    {ASSIGNMENT_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Protocol member" error={errors.protocol_member_id?.message}>
            <Select
              value={protocolMemberId}
              onValueChange={(value) =>
                setValue('protocol_member_id', value ?? '', { shouldValidate: true })
              }
              disabled={membersLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    sortedMembers.find((m) => m._id === value)?.full_name ?? 'Select a member'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sortedMembers.map((member) => (
                  <SelectItem key={member._id} value={member._id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Scheduled time" error={errors.scheduled_time?.message}>
            <Input type="datetime-local" {...register('scheduled_time')} />
          </Field>

          <Field label="Notes (optional)" error={errors.notes?.message}>
            <Textarea
              {...register('notes')}
              placeholder="e.g. flight delayed, took alternate route"
              rows={2}
            />
          </Field>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Assign'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-caption text-destructive">{error}</p>}
    </div>
  );
}
