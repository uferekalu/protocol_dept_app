'use client';

import Image from 'next/image';
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
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/pcn-logo.png"
          alt="Presbyterian Church of Nigeria"
          width={57}
          height={40}
          priority
          className="mb-3 h-10 w-auto"
        />
        <h1 className="text-heading-lg text-foreground">Protocol Department</h1>
        <p className="text-body-sm text-muted-foreground">
          Log in with your phone number and password.
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
          <Input {...register('password')} type="password" autoComplete="current-password" />
        </Field>

        <Button type="submit" size="lg" className="mt-2 h-11 text-body font-semibold" disabled={isLoading}>
          {isLoading ? 'Logging in…' : 'Log in'}
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
