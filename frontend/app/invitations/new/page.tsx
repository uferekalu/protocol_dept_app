'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { InvitationForm } from '@/components/invitation-form';
import { RequireElevatedRole } from '@/components/require-elevated-role';

// Invitation create — brief Section 5 (screen 4) / frontend/CLAUDE.md's screen order.
// Reached from a minister's profile page's "New Invitation" button, which passes
// ?minister_id= to preselect the minister. ADMIN/COORDINATOR-only, same as the backend.
export default function NewInvitationPage() {
  return (
    <RequireElevatedRole>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Suspense>
          <NewInvitationContent />
        </Suspense>
      </main>
    </RequireElevatedRole>
  );
}

function NewInvitationContent() {
  const searchParams = useSearchParams();
  const ministerId = searchParams.get('minister_id') ?? undefined;

  return (
    <>
      <Link
        href={ministerId ? `/ministers/${ministerId}` : '/ministers'}
        className="text-body-sm mb-4 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>
      <h1 className="text-heading-lg mb-1 text-foreground">New invitation</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Link a minister to an event with their arrival, hotel, and preaching schedule.
      </p>
      <InvitationForm defaultMinisterId={ministerId} />
    </>
  );
}
