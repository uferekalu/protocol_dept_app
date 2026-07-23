'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import {
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
  type ForgotPasswordFormValues,
  type ResetPasswordFormValues,
} from '@/lib/schemas/auth';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/lib/redux/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

// Two-step SMS-based password reset (brief Section 4G's spec, deferred pending Termii
// credentials — see forgot-password.dto.ts/reset-password.dto.ts on the backend).
// Step 1 always "succeeds" from the caller's point of view whether or not the phone
// number has an account (AuthService.forgotPassword()'s anti-enumeration design), so the
// UI can't and shouldn't distinguish those cases either.
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'reset'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [forgotPassword, { isLoading: isRequestingCode }] = useForgotPasswordMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const phoneForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { phone_number: '' },
  });

  const resetForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { otp: '', new_password: '', confirm_password: '' },
  });

  async function requestCode(values: ForgotPasswordFormValues) {
    try {
      await forgotPassword(values).unwrap();
      setPhoneNumber(values.phone_number);
      setStep('reset');
      toast.success('If that phone number has an account, we sent it a reset code.');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Something went wrong. Please try again.');
    }
  }

  async function resendCode() {
    try {
      await forgotPassword({ phone_number: phoneNumber }).unwrap();
      toast.success('Code resent.');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Could not resend the code.');
    }
  }

  async function submitReset(values: ResetPasswordFormValues) {
    try {
      await resetPassword({ phone_number: phoneNumber, ...values }).unwrap();
      toast.success('Password reset. Log in with your new password.');
      router.push('/login');
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'Invalid or expired code.');
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-16 sm:py-24">
      <div className="mb-8">
        <h1 className="text-heading-lg text-foreground">Reset your password</h1>
        <p className="text-body-sm text-muted-foreground">
          {step === 'phone'
            ? "Enter your phone number and we'll text you a reset code."
            : `Enter the code sent to ${phoneNumber} and choose a new password.`}
        </p>
      </div>

      {step === 'phone' && (
        <form onSubmit={phoneForm.handleSubmit(requestCode)} className="flex flex-col gap-4">
          <Field label="Phone number" error={phoneForm.formState.errors.phone_number?.message}>
            <Input
              {...phoneForm.register('phone_number')}
              type="tel"
              autoComplete="tel"
              placeholder="+234..."
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-11 text-body font-semibold"
            disabled={isRequestingCode}
          >
            {isRequestingCode ? 'Sending code…' : 'Send reset code'}
          </Button>
        </form>
      )}

      {step === 'reset' && (
        <form onSubmit={resetForm.handleSubmit(submitReset)} className="flex flex-col gap-4">
          <Field label="6-digit code" error={resetForm.formState.errors.otp?.message}>
            <Input
              {...resetForm.register('otp')}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
            />
          </Field>
          <Field label="New password" error={resetForm.formState.errors.new_password?.message}>
            <PasswordInput {...resetForm.register('new_password')} autoComplete="new-password" />
          </Field>
          <Field
            label="Confirm new password"
            error={resetForm.formState.errors.confirm_password?.message}
          >
            <PasswordInput
              {...resetForm.register('confirm_password')}
              autoComplete="new-password"
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-11 text-body font-semibold"
            disabled={isResetting}
          >
            {isResetting ? 'Resetting password…' : 'Reset password'}
          </Button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resendCode}
              disabled={isRequestingCode}
              className="text-body-sm text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="text-body-sm text-muted-foreground hover:text-foreground"
            >
              Wrong number?
            </button>
          </div>
        </form>
      )}

      <Link
        href="/login"
        className="text-body-sm mt-6 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to log in
      </Link>
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
