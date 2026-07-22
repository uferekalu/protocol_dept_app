'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Plus, UserRound } from 'lucide-react';
import { useGetMinistersQuery } from '@/lib/redux/api';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isElevatedRole } from '@/lib/constants/protocol-member';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { MinisterFormDialog } from '@/components/minister-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Minister list — brief Section 5 (screen 3) / frontend/CLAUDE.md's screen order.
// Reusable profiles across every event, so this is a plain browse/create screen;
// edit and delete live on the profile page, not here. "Add Minister" is
// ADMIN/COORDINATOR-only, matching the backend's @Roles guard on POST /ministers — a
// plain MEMBER never sees a control the API would reject.
export default function MinistersPage() {
  const { data: ministers, isLoading, isError, error, refetch } = useGetMinistersQuery();
  const { data: currentUser } = useCurrentUser();
  const canManage = isElevatedRole(currentUser?.role);
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="text-heading-lg text-foreground">Ministers</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Profiles are reusable across every event, year after year.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="h-10 gap-1.5">
            <Plus className="size-4" />
            Add Minister
          </Button>
        )}
      </div>

      {isLoading && <ListSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load ministers</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && ministers && ministers.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <UserRound className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No ministers yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Add the first minister profile to start inviting them to events.
          </p>
          {canManage && (
            <Button onClick={() => setCreateOpen(true)} className="mt-1 gap-1.5">
              <Plus className="size-4" />
              Add Minister
            </Button>
          )}
        </EmptyPanel>
      )}

      {!isLoading && !isError && ministers && ministers.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Title</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="hidden lg:table-cell">Home church / parish</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ministers.map((minister) => (
                <TableRow
                  key={minister._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/ministers/${minister._id}`)}
                >
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/ministers/${minister._id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {minister.full_name}
                    </Link>
                    <p className="text-caption text-muted-foreground sm:hidden">
                      {minister.title}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {minister.title}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {minister.phone_number}
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-muted-foreground lg:table-cell">
                    {minister.home_church_or_parish}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MinisterFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border p-3 last:border-0">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="hidden h-4 w-1/6 sm:block" />
          <Skeleton className="hidden h-4 w-1/4 md:block" />
        </div>
      ))}
    </div>
  );
}
