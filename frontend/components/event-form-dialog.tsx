'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { eventFormSchema, type EventFormValues } from '@/lib/schemas/event';
import { useCreateEventMutation, useUpdateEventMutation } from '@/lib/redux/api';
import type { Event } from '@/lib/types/event';

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Present => edit mode, prefilled with this event's current values.
  event?: Event;
}

const EMPTY_VALUES: EventFormValues = {
  name: '',
  start_date: '',
  end_date: '',
  venue: '',
  description: '',
};

// Mirrors components/minister-form-dialog.tsx's pattern: react-hook-form + zod
// (eventFormSchema mirrors CreateEventDto), a Dialog rather than a separate /events/new
// route since creating an event is a quick add, not a multi-step flow.
export function EventFormDialog({ open, onOpenChange, event }: EventFormDialogProps) {
  const isEdit = Boolean(event);
  const [createEvent, { isLoading: isCreating }] = useCreateEventMutation();
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // react-hook-form doesn't re-derive defaultValues after mount, so re-seed the form
  // explicitly every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    reset(
      event
        ? {
            name: event.name,
            start_date: event.start_date.slice(0, 10),
            end_date: event.end_date.slice(0, 10),
            venue: event.venue,
            description: event.description ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, event, reset]);

  async function onSubmit(values: EventFormValues) {
    const payload = {
      ...values,
      description: values.description || undefined,
    };

    try {
      if (isEdit && event) {
        await updateEvent({ id: event._id, ...payload }).unwrap();
        toast.success(`${values.name} updated`);
      } else {
        await createEvent(payload).unwrap();
        toast.success(`${values.name} added`);
      }
      onOpenChange(false);
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string | string[] })?.message
          : undefined;
      toast.error(Array.isArray(message) ? message.join(', ') : (message ?? 'Something went wrong.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit event' : 'Add event'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this event.' : 'Revivals and Crusades ministers get invited to.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Field label="Name" error={errors.name?.message}>
            <Input {...register('name')} placeholder="2026 Easter Revival" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" error={errors.start_date?.message}>
              <Input type="date" {...register('start_date')} />
            </Field>
            <Field label="End date" error={errors.end_date?.message}>
              <Input type="date" {...register('end_date')} />
            </Field>
          </div>
          <Field label="Venue" error={errors.venue?.message}>
            <Input {...register('venue')} placeholder="National Ecumenical Centre, Abuja" />
          </Field>
          <Field label="Description (optional)" error={errors.description?.message}>
            <Textarea {...register('description')} placeholder="Annual Easter revival crusade" rows={3} />
          </Field>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add event'}
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
