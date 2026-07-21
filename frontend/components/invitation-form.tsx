'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { invitationFormSchema, type InvitationFormValues } from '@/lib/schemas/invitation';
import {
  useCreateInvitationMutation,
  useUpdateInvitationMutation,
  useGetMinistersQuery,
  useGetEventsQuery,
} from '@/lib/redux/api';
import type { Invitation } from '@/lib/types/invitation';

interface InvitationFormProps {
  // Present => edit mode, prefilled with this invitation's current values.
  invitation?: Invitation;
  // Preselects the minister when arriving from that minister's profile page's
  // "New Invitation" button — the only entry point into create mode right now.
  defaultMinisterId?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeDays(arrival: string, departure: string): number | undefined {
  if (!arrival || !departure) return undefined;
  const days = Math.round(
    (new Date(departure).getTime() - new Date(arrival).getTime()) / MS_PER_DAY,
  );
  return days >= 0 ? days + 1 : undefined;
}

function emptyValues(defaultMinisterId?: string): InvitationFormValues {
  return {
    minister_id: defaultMinisterId ?? '',
    event_id: '',
    arrival_date: '',
    departure_date: '',
    number_of_days: 1,
    hotel_name: '',
    hotel_address: '',
    hotel_room_number: '',
    preaching_dates: [],
  };
}

// Full-page form (not a dialog) per frontend/CLAUDE.md's screen order — richer than
// the Minister dialog (dates, hotel details, a variable-length preaching schedule),
// so it gets its own routes: /invitations/new and /invitations/[id]/edit.
export function InvitationForm({ invitation, defaultMinisterId }: InvitationFormProps) {
  const isEdit = Boolean(invitation);
  const router = useRouter();
  const { data: ministers, isLoading: ministersLoading } = useGetMinistersQuery();
  const { data: events, isLoading: eventsLoading } = useGetEventsQuery();
  const [createInvitation, { isLoading: isCreating }] = useCreateInvitationMutation();
  const [updateInvitation, { isLoading: isUpdating }] = useUpdateInvitationMutation();
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<InvitationFormValues>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: emptyValues(defaultMinisterId),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'preaching_dates' });

  useEffect(() => {
    if (!invitation) return;
    reset({
      minister_id: invitation.minister_id,
      event_id: invitation.event_id,
      arrival_date: invitation.arrival_date.slice(0, 10),
      departure_date: invitation.departure_date.slice(0, 10),
      number_of_days: invitation.number_of_days,
      hotel_name: invitation.hotel_name,
      hotel_address: invitation.hotel_address,
      hotel_room_number: invitation.hotel_room_number ?? '',
      preaching_dates: invitation.preaching_dates.map((date) => ({ date: date.slice(0, 10) })),
    });
  }, [invitation, reset]);

  const ministerId = useWatch({ control, name: 'minister_id' });
  const eventId = useWatch({ control, name: 'event_id' });
  const arrivalDate = useWatch({ control, name: 'arrival_date' });
  const departureDate = useWatch({ control, name: 'departure_date' });

  // Recompute live as dates change, per frontend/CLAUDE.md — the coordinator can still
  // hand-edit the field afterward; it isn't clobbered again until the dates change
  // once more.
  useEffect(() => {
    const days = computeDays(arrivalDate, departureDate);
    if (days !== undefined) {
      setValue('number_of_days', days, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalDate, departureDate]);

  async function onSubmit(values: InvitationFormValues) {
    const payload = {
      minister_id: values.minister_id,
      event_id: values.event_id,
      arrival_date: values.arrival_date,
      departure_date: values.departure_date,
      number_of_days: values.number_of_days,
      hotel_name: values.hotel_name,
      hotel_address: values.hotel_address,
      hotel_room_number: values.hotel_room_number || undefined,
      preaching_dates: values.preaching_dates.map((entry) => entry.date),
    };

    try {
      if (isEdit && invitation) {
        await updateInvitation({ id: invitation._id, ...payload }).unwrap();
        toast.success('Invitation updated');
        router.push(`/invitations/${invitation._id}`);
      } else {
        const created = await createInvitation(payload).unwrap();
        toast.success('Invitation created');
        router.push(`/invitations/${created._id}`);
      }
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

  if (ministersLoading || eventsLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Minister" error={errors.minister_id?.message}>
          <Select
            value={ministerId}
            onValueChange={(value) =>
              setValue('minister_id', value ?? '', { shouldValidate: true })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a minister" />
            </SelectTrigger>
            <SelectContent>
              {ministers?.map((minister) => (
                <SelectItem key={minister._id} value={minister._id}>
                  {minister.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Event" error={errors.event_id?.message}>
          <Select
            value={eventId}
            onValueChange={(value) => setValue('event_id', value ?? '', { shouldValidate: true })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events?.map((event) => (
                <SelectItem key={event._id} value={event._id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Arrival date" error={errors.arrival_date?.message}>
          <Input type="date" {...register('arrival_date')} />
        </Field>
        <Field label="Departure date" error={errors.departure_date?.message}>
          <Input type="date" {...register('departure_date')} />
        </Field>
        <Field label="Number of days" error={errors.number_of_days?.message}>
          <Input type="number" min={1} {...register('number_of_days')} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Hotel name" error={errors.hotel_name?.message}>
          <Input {...register('hotel_name')} placeholder="Transcorp Hilton" />
        </Field>
        <Field label="Hotel address" error={errors.hotel_address?.message}>
          <Input
            {...register('hotel_address')}
            placeholder="1 Aguiyi Ironsi St, Maitama, Abuja"
          />
        </Field>
      </div>
      <Field label="Hotel room number (optional)" error={errors.hotel_room_number?.message}>
        <Input {...register('hotel_room_number')} placeholder="204" />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Preaching dates (optional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => append({ date: '' })}
          >
            <Plus className="size-4" />
            Add date
          </Button>
        </div>
        {fields.length === 0 && (
          <p className="text-caption text-muted-foreground">No preaching dates added yet.</p>
        )}
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Input type="date" {...register(`preaching_dates.${index}.date`)} className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Remove date"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {errors.preaching_dates?.[index]?.date && (
              <p className="text-caption text-destructive">
                {errors.preaching_dates[index]?.date?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create invitation'}
        </Button>
      </div>
    </form>
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
