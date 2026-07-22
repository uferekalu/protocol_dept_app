'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { signupFormSchema, type SignupFormValues } from '@/lib/schemas/auth';
import { useSignupMutation } from '@/lib/redux/api';
import { useAppDispatch } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, setToken } from '@/lib/redux/slices/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

// Sign Up — self-service account creation (brief Section 4G, "revised from the
// original spec": Protocol Members join by signing up themselves — the department
// announces the need for volunteers, interested people join via this screen — rather
// than an Admin or Coordinator creating their account). Always lands as MEMBER; role is
// never a field here. Same auto-login pattern as the invitation flow: on success, the
// new member is dispatched straight into a logged-in session, matching POST
// /auth/signup's response shape (identical to login's).
export default function SignupPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [signup, { isLoading }] = useSignupMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { full_name: '', phone_number: '', password: '', confirm_password: '' },
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const result = await signup({
        full_name: values.full_name,
        phone_number: values.phone_number,
        password: values.password,
      }).unwrap();
      dispatch(setToken(result.access_token));
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, result.access_token);
      toast.success(`Welcome, ${result.protocol_member.full_name}`);
      router.push('/');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string | string[] })?.message
          : undefined;
      toast.error(
        Array.isArray(message) ? message.join(', ') : (message ?? 'Could not sign up. Please try again.'),
      );
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <h1 className="text-heading-lg text-foreground">Join the Protocol Department</h1>
        <p className="text-body-sm text-muted-foreground">
          Create your own account to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field label="Full name" error={errors.full_name?.message}>
          <Input {...register('full_name')} placeholder="Grace Adeyemi" autoComplete="name" />
        </Field>
        <Field label="Phone number" error={errors.phone_number?.message}>
          <Input
            {...register('phone_number')}
            type="tel"
            autoComplete="tel"
            placeholder="+234..."
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <PasswordInput {...register('password')} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" error={errors.confirm_password?.message}>
          <PasswordInput {...register('confirm_password')} autoComplete="new-password" />
        </Field>

        <Button type="submit" size="lg" className="mt-2 h-11 text-body font-semibold" disabled={isLoading}>
          {isLoading ? 'Creating account…' : 'Sign up'}
        </Button>
      </form>

      <p className="text-body-sm mt-6 text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Log in
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
