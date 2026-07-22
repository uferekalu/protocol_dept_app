'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { Skeleton } from '@/components/ui/skeleton';

// Stable "My Profile" link (used by UserMenu) that doesn't need to know your own id
// ahead of time — redirects to your own /team/[id], which already has the self-edit
// form. Not logged in? Send them to log in first.
export default function ProfileRedirectPage() {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    router.replace(currentUser ? `/team/${currentUser._id}` : '/login');
  }, [isLoading, currentUser, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-6 sm:py-8">
      <Skeleton className="h-10 w-full" />
    </main>
  );
}
