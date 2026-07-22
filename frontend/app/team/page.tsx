'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Users } from 'lucide-react';
import { useGetProtocolMembersQuery } from '@/lib/redux/api';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { PROTOCOL_MEMBER_ROLE_LABELS } from '@/lib/constants/protocol-member';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Member Directory — brief Section 5 (screen 11) / frontend/CLAUDE.md's screen order:
// read-only, open to every logged-in role (brief Section 4G — everyone can see who
// else is in the department). Editing lives on /team/[id], scoped to self or an Admin
// changing someone else's role.
export default function TeamPage() {
  const { data: members, isLoading, isError, error, refetch } = useGetProtocolMembersQuery();
  const router = useRouter();

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-heading-lg text-foreground">Team</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Everyone in the Protocol Department.
        </p>
      </div>

      {isLoading && <ListSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the team</p>
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

      {!isLoading && !isError && members && members.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <Users className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No one has joined yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Protocol Members show up here once they sign up.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && members && members.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow
                  key={member._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/team/${member._id}`)}
                >
                  <TableCell className="whitespace-normal">
                    <div className="flex items-center gap-3">
                      <Avatar imageUrl={member.image_url} name={member.full_name} size="sm" />
                      <div>
                        <Link
                          href={`/team/${member._id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {member.full_name}
                        </Link>
                        <p className="text-caption text-muted-foreground sm:hidden">
                          {member.phone_number}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {member.phone_number}
                  </TableCell>
                  <TableCell>
                    <span className="text-label rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                      {PROTOCOL_MEMBER_ROLE_LABELS[member.role]}
                    </span>
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
    </main>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border p-3 last:border-0">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="hidden h-4 w-1/4 sm:block" />
          <Skeleton className="h-4 w-1/6" />
        </div>
      ))}
    </div>
  );
}
