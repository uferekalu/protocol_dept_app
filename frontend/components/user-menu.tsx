'use client';

import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useAppDispatch } from '@/lib/redux/hooks';
import { AUTH_TOKEN_STORAGE_KEY, clearToken } from '@/lib/redux/slices/authSlice';
import { PROTOCOL_MEMBER_ROLE_LABELS } from '@/lib/constants/protocol-member';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Lives where ActingAsPicker used to — the header's real-identity slot, now backed by
// an actual login (Phase 5) instead of a manual "who are you" picker.
export function UserMenu() {
  const dispatch = useAppDispatch();
  const { data: user, isLoading } = useCurrentUser();

  function handleLogout() {
    dispatch(clearToken());
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }

  if (isLoading) {
    return <Skeleton className="h-8 w-20" />;
  }

  if (!user) {
    return (
      <Link href="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Log in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-body-sm font-medium text-foreground">{user.full_name}</p>
        <p className="text-caption text-muted-foreground">
          {PROTOCOL_MEMBER_ROLE_LABELS[user.role]}
        </p>
      </div>
      <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
