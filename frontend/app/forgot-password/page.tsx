import Link from 'next/link';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';

// Forgot password — the link exists per the brief's spec, but the actual "text a code
// to your phone" flow depends on an SMS provider (Termii) that hasn't been configured
// yet (backend/.env has no TERMII_API_KEY). Rather than ship a form that silently fails
// or a 404, this is an honest placeholder: once the provider is wired up, this becomes
// a two-step phone-number -> code -> new-password flow.
export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col px-4 py-16 sm:py-24">
      <EmptyPanel>
        <IconBadge tone="primary">
          <MessageSquareText className="size-7" />
        </IconBadge>
        <p className="text-heading-md text-foreground">Password reset by SMS is coming soon</p>
        <p className="text-body-sm max-w-xs text-muted-foreground">
          We&apos;re setting up text-message verification so you can reset your password with a
          code sent to your phone. In the meantime, ask an Admin or Coordinator for help
          regaining access to your account.
        </p>
        <Link
          href="/login"
          className="text-body-sm mt-2 inline-flex items-center gap-1 text-primary hover:underline"
        >
          <ArrowLeft className="size-4" />
          Back to log in
        </Link>
      </EmptyPanel>
    </main>
  );
}
