'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Camera, KeyRound, Loader2, Phone, ShieldCheck, X } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useGetProtocolMemberQuery,
  useUpdateProtocolMemberMutation,
  useUploadProtocolMemberPhotoMutation,
  useRemoveProtocolMemberPhotoMutation,
} from '@/lib/redux/api';
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PROTOCOL_MEMBER_ROLE_LABELS } from '@/lib/constants/protocol-member';
import type { ProtocolMemberRole } from '@/lib/types/protocol-member';

const ROLE_ORDER: ProtocolMemberRole[] = ['MEMBER', 'COORDINATOR', 'ADMIN'];
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

// Member detail — brief Section 5 (screen 11). Three read/edit modes depending on who's
// looking:
// - Viewing yourself: a full edit form (name, phone, optional new password) — "My
//   Profile." No role field here even for a self-admin; role changes only happen when
//   an Admin is looking at *someone else's* entry, per the brief's explicit "Admin can
//   upgrade a member to Coordinator" framing.
// - An Admin viewing someone else: read-only identity info plus a role-change control.
// - Anyone else viewing someone else: fully read-only, matching backend/CLAUDE.md's
//   PATCH /protocol-members/:id authorization (self-or-ADMIN only).
export default function TeamMemberPage() {
  const { id } = useParams<{ id: string }>();
  const { data: currentUser } = useCurrentUser();
  const {
    data: member,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetProtocolMemberQuery(id);
  const [updateMember, { isLoading: isSavingProfile }] = useUpdateProtocolMemberMutation();
  const [updateRole, { isLoading: isSavingRole }] = useUpdateProtocolMemberMutation();
  const [uploadPhoto, { isLoading: isUploadingPhoto }] = useUploadProtocolMemberPhotoMutation();
  const [removePhoto, { isLoading: isRemovingPhoto }] = useRemoveProtocolMemberPhotoMutation();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isSelf = currentUser?._id === id;
  const isAdmin = currentUser?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { full_name: '', phone_number: '', email: '' },
  });

  useEffect(() => {
    if (member && isSelf) {
      reset({
        full_name: member.full_name,
        phone_number: member.phone_number,
        email: member.email ?? '',
      });
    }
  }, [member, isSelf, reset]);

  async function onSubmitProfile(values: ProfileFormValues) {
    try {
      await updateMember({
        id,
        full_name: values.full_name,
        phone_number: values.phone_number,
        email: values.email || undefined,
      }).unwrap();
      toast.success('Profile updated');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Could not update your profile.');
    }
  }

  async function handlePhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      toast.error('Photo must be under 5MB.');
      return;
    }

    try {
      await uploadPhoto({ id, file }).unwrap();
      toast.success('Photo updated');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Could not upload your photo.');
    }
  }

  async function handleRemovePhoto() {
    try {
      await removePhoto(id).unwrap();
      toast.success('Photo removed');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Could not remove your photo.');
    }
  }

  async function handleRoleChange(role: ProtocolMemberRole) {
    try {
      await updateRole({ id, role }).unwrap();
      toast.success(`Role changed to ${PROTOCOL_MEMBER_ROLE_LABELS[role]}`);
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Could not change this role.');
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-8">
      <Link
        href="/team"
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Team
      </Link>

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load this member</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error && error.status === 404
              ? 'This member no longer exists.'
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {member && isSelf && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar imageUrl={member.image_url} name={member.full_name} size="lg" />
              {isUploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                  <Loader2 className="size-5 animate-spin text-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                aria-label="Change profile photo"
                className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border border-border bg-secondary text-secondary-foreground shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <Camera className="size-3.5" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
              />
            </div>
            <div>
              <h1 className="text-heading-lg text-foreground">My Profile</h1>
              <p className="text-body-sm text-muted-foreground">
                {PROTOCOL_MEMBER_ROLE_LABELS[member.role]}
              </p>
              {member.image_url && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={isRemovingPhoto}
                  className="text-caption mt-1 inline-flex items-center gap-1 text-muted-foreground hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                >
                  <X className="size-3" />
                  {isRemovingPhoto ? 'Removing…' : 'Remove photo'}
                </button>
              )}
            </div>
          </div>
          <form onSubmit={handleSubmit(onSubmitProfile)} className="flex flex-col gap-4">
            <Field label="Full name" error={errors.full_name?.message}>
              <Input {...register('full_name')} autoComplete="name" />
            </Field>
            <Field label="Phone number" error={errors.phone_number?.message}>
              <Input {...register('phone_number')} type="tel" autoComplete="tel" />
            </Field>
            <Field label="Email (optional)" error={errors.email?.message}>
              <Input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" />
            </Field>
            <Button type="submit" size="lg" className="mt-2 h-11" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </form>

          <Link
            href="/change-password"
            className="text-body-sm mt-6 inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <KeyRound className="size-4" />
            Change password
          </Link>
        </>
      )}

      {member && !isSelf && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <Avatar imageUrl={member.image_url} name={member.full_name} size="lg" />
            <div>
              <h1 className="text-heading-lg text-foreground">{member.full_name}</h1>
              <div className="mt-1 flex flex-col gap-1.5">
                <DetailRow icon={<Phone className="size-4" />}>{member.phone_number}</DetailRow>
                <DetailRow icon={<ShieldCheck className="size-4" />}>
                  {PROTOCOL_MEMBER_ROLE_LABELS[member.role]}
                </DetailRow>
              </div>
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-heading-md mb-1 text-foreground">Change role</p>
              <p className="text-body-sm mb-4 text-muted-foreground">
                Only an Admin can do this.
              </p>
              <Select
                value={member.role}
                onValueChange={(value) => handleRoleChange(value as ProtocolMemberRole)}
                disabled={isSavingRole}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: ProtocolMemberRole | null) =>
                      (value && PROTOCOL_MEMBER_ROLE_LABELS[value]) ?? 'Select a role'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_ORDER.map((role) => (
                    <SelectItem key={role} value={role}>
                      {PROTOCOL_MEMBER_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function extractErrorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'data' in error) {
    const message = (error.data as { message?: string | string[] })?.message;
    return Array.isArray(message) ? message.join(', ') : message;
  }
  return undefined;
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

function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="text-body-sm flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
