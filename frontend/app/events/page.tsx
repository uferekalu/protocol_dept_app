'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarRange, ChevronRight, Plus } from 'lucide-react';
import { useGetEventsQuery } from '@/lib/redux/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { EventFormDialog } from '@/components/event-form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const end = new Date(endDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${start} – ${end}`;
}

// Events list — brief Section 5 (screen 8) / frontend/CLAUDE.md's screen order. Events
// were previously only creatable via Swagger; this is the first UI for them.
export default function EventsPage() {
  const { data: events, isLoading, isError, error, refetch } = useGetEventsQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 sm:mb-8">
        <div>
          <h1 className="text-heading-lg text-foreground">Events</h1>
          <p className="text-body-sm max-w-2xl text-muted-foreground">
            Revivals and Crusades that ministers get invited to.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="h-10 gap-1.5">
          <Plus className="size-4" />
          Add Event
        </Button>
      </div>

      {isLoading && <ListSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load events</p>
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

      {!isLoading && !isError && events && events.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <CalendarRange className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No events yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Add the first event before inviting ministers to it.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="mt-1 gap-1.5">
            <Plus className="size-4" />
            Add Event
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && events && events.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Dates</TableHead>
                <TableHead className="hidden md:table-cell">Venue</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow
                  key={event._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/events/${event._id}`)}
                >
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/events/${event._id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {event.name}
                    </Link>
                    <p className="text-caption text-muted-foreground sm:hidden">
                      {formatDateRange(event.start_date, event.end_date)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDateRange(event.start_date, event.end_date)}
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-muted-foreground md:table-cell">
                    {event.venue}
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

      <EventFormDialog open={createOpen} onOpenChange={setCreateOpen} />
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
          <Skeleton className="hidden h-4 w-1/4 md:block" />
        </div>
      ))}
    </div>
  );
}
