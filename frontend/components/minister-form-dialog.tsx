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
import { ministerFormSchema, type MinisterFormValues } from '@/lib/schemas/minister';
import { useCreateMinisterMutation, useUpdateMinisterMutation } from '@/lib/redux/api';
import type { Minister } from '@/lib/types/minister';

interface MinisterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Present => edit mode, prefilled with this minister's current values.
  minister?: Minister;
}

const EMPTY_VALUES: MinisterFormValues = {
  full_name: '',
  title: '',
  phone_number: '',
  email: '',
  home_church_or_parish: '',
  notes: '',
};

// The one form every later screen's forms follow the pattern of: react-hook-form +
// zod (ministerFormSchema mirrors CreateMinisterDto), per frontend/CLAUDE.md. A
// Dialog rather than a separate /ministers/new route — profiles are a quick add,
// reusable across events, not a multi-step flow.
export function MinisterFormDialog({ open, onOpenChange, minister }: MinisterFormDialogProps) {
  const isEdit = Boolean(minister);
  const [createMinister, { isLoading: isCreating }] = useCreateMinisterMutation();
  const [updateMinister, { isLoading: isUpdating }] = useUpdateMinisterMutation();
  const isSubmitting = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MinisterFormValues>({
    resolver: zodResolver(ministerFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // react-hook-form doesn't re-derive defaultValues after mount, so re-seed the form
  // explicitly every time the dialog opens (covers both "opened for a different
  // minister" and "reopened after a previous edit").
  useEffect(() => {
    if (!open) return;
    reset(
      minister
        ? {
            full_name: minister.full_name,
            title: minister.title,
            phone_number: minister.phone_number,
            email: minister.email ?? '',
            home_church_or_parish: minister.home_church_or_parish,
            notes: minister.notes ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, minister, reset]);

  async function onSubmit(values: MinisterFormValues) {
    // Blank optional fields should be omitted, not sent as "" — matches the backend
    // DTO's @IsOptional() semantics rather than overwriting existing data with empty
    // strings.
    const payload = {
      ...values,
      email: values.email || undefined,
      notes: values.notes || undefined,
    };

    try {
      if (isEdit && minister) {
        await updateMinister({ id: minister._id, ...payload }).unwrap();
        toast.success(`${values.full_name} updated`);
      } else {
        await createMinister(payload).unwrap();
        toast.success(`${values.full_name} added`);
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
      {/*
        max-h + overflow-y-auto lives on DialogContent itself, not on an inner
        wrapper — DialogFooter uses a negative-margin trick (-mx-4 -mb-4) to bleed to
        the dialog's edges, which breaks scrollHeight calculation (and makes the
        footer geometrically escape the container, unreachable) if it's nested inside
        its own separate overflow-auto ancestor. One scroll region for the whole
        dialog is the robust fix, verified against a short (568px) mobile viewport.
      */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit minister' : 'Add minister'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this minister's profile."
              : 'Minister profiles are reusable across every future event.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Field label="Full name" error={errors.full_name?.message}>
            <Input {...register('full_name')} placeholder="Rev. Dr. John Adebayo" />
          </Field>
          <Field label="Title" error={errors.title?.message}>
            <Input {...register('title')} placeholder="Rev. Dr." />
          </Field>
          <Field label="Phone number" error={errors.phone_number?.message}>
            <Input {...register('phone_number')} placeholder="+234..." />
          </Field>
          <Field label="Email (optional)" error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="minister@example.com" />
          </Field>
          <Field
            label="Home church or parish"
            error={errors.home_church_or_parish?.message}
          >
            <Input
              {...register('home_church_or_parish')}
              placeholder="St. Andrews Presbyterian Church"
            />
          </Field>
          <Field label="Notes (optional)" error={errors.notes?.message}>
            <Textarea
              {...register('notes')}
              placeholder="Dietary needs, special requests, etc."
              rows={3}
            />
          </Field>

          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add minister'}
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
