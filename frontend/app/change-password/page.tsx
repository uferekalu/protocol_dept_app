'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from '@/lib/schemas/auth';
import { useChangePasswordMutation } from '@/lib/redux/api';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

// Dedicated change-password screen (brief Section 4G / this session's spec) — separate
// from the general profile-edit form on /team/[id], since a password change has its own
// rule (must differ from the current password, enforced server-side in
// AuthService.changePassword()) that a "leave blank to keep it" field on the profile
// form couldn't express cleanly.
export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      await changePassword({ new_password: values.new_password }).unwrap();
      toast.success('Password changed');
      router.push(currentUser ? `/team/${currentUser._id}` : '/');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string | string[] })?.message
          : undefined;
      toast.error(
        Array.isArray(message) ? message.join(', ') : (message ?? 'Could not change your password.'),
      );
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-6 sm:py-8">
      <Link
        href={currentUser ? `/team/${currentUser._id}` : '/'}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to profile
      </Link>

      <div className="mb-8">
        <h1 className="text-heading-lg text-foreground">Change password</h1>
        <p className="text-body-sm text-muted-foreground">
          Choose a new password. It must be different from your current one.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="New password" error={errors.new_password?.message}>
          <PasswordInput {...register('new_password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={errors.confirm_password?.message}>
          <PasswordInput {...register('confirm_password')} autoComplete="new-password" />
        </Field>

        <Button type="submit" size="lg" className="mt-2 h-11 text-body font-semibold" disabled={isLoading}>
          {isLoading ? 'Changing password…' : 'Change password'}
        </Button>
      </form>
    </main>
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
