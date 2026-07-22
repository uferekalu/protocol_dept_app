'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { loginFormSchema, type LoginFormValues } from '@/lib/schemas/auth';
import { useLoginMutation } from '@/lib/redux/api';
import { useAppDispatch } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, setToken } from '@/lib/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

// Login — Phase 5 (docs/PROTOCOL_APP_BRIEF.md Section 7). Phone number + password
// against POST /auth/login; on success, the token is both dispatched into authSlice
// (the app's live source of truth) and persisted to localStorage so the session
// survives a reload — see components/auth-hydrator.tsx for the read side.
export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { phone_number: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await login(values).unwrap();
      dispatch(setToken(result.access_token));
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.access_token);
      toast.success(`Welcome back, ${result.protocol_member.full_name}`);
      router.push('/');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not log in. Please try again.');
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <h1 className="text-heading-lg text-foreground">Log in</h1>
        <p className="text-body-sm text-muted-foreground">
          Enter your phone number and password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Phone number" error={errors.phone_number?.message}>
          <Input
            {...register('phone_number')}
            type="tel"
            autoComplete="tel"
            placeholder="+234..."
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput {...register('password')} autoComplete="current-password" />
        </Field>

        <div className="text-right">
          <Link href="/forgot-password" className="text-body-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="mt-2 h-11 text-body font-semibold" disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <p className="text-body-sm mt-6 text-center text-muted-foreground">
        New to the Protocol Department?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </p>
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
