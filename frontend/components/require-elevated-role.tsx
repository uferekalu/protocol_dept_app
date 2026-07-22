'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isElevatedRole } from '@/lib/constants/protocol-member';

// Wraps a page only an ADMIN/COORDINATOR should reach directly by URL — e.g.
// /invitations/new and /invitations/[id]/edit, which have no dialog/button gate the
// way Ministers/Events' create-edit forms do. The backend already rejects the
// underlying POST/PATCH for a MEMBER, but bouncing them before they fill out a form
// they can't submit is better UX than a rejected-request toast at the end.
export function RequireElevatedRole({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading || !currentUser) return;
    if (!isElevatedRole(currentUser.role)) {
      toast.error('Only an Admin or Coordinator can do that.');
      router.replace('/');
    }
  }, [isLoading, currentUser, router]);

  if (isLoading || !currentUser || !isElevatedRole(currentUser.role)) return null;

  return <>{children}</>;
}
