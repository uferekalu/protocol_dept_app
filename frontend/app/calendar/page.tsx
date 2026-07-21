'use client';

import { useMemo } from 'react';
import { AlertTriangle, CalendarDays, RefreshCw } from 'lucide-react';
import { useGetCurrentlyHostingQuery } from '@/lib/redux/api';
import { buildCalendarEvents, groupEventsByBucket, withinNextDays } from '@/lib/calendar';
import { CalendarEventRow } from '@/components/calendar-event-row';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const UPCOMING_WINDOW_DAYS = 7;

// Calendar / Schedule View — brief Section 4D, frontend/CLAUDE.md's screen order step
// 7. Agenda-style (not a month grid) per the mobile-first bar: every arrival,
// departure, and preaching date across everyone currently hosted, chronologically
// grouped, plus quick "upcoming" call-outs for the next 7 days.
export default function CalendarPage() {
  const { data: invitations, isLoading, isError, error, refetch } = useGetCurrentlyHostingQuery();

  const events = useMemo(() => buildCalendarEvents(invitations ?? []), [invitations]);
  const buckets = useMemo(() => groupEventsByBucket(events), [events]);
  const arrivals = useMemo(
    () =>
      withinNextDays(events, 'ARRIVAL', UPCOMING_WINDOW_DAYS).filter(
        (event) => event.invitation.status === 'INVITED',
      ),
    [events],
  );
  const departures = useMemo(
    () => withinNextDays(events, 'DEPARTURE', UPCOMING_WINDOW_DAYS),
    [events],
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <h1 className="text-heading-lg text-foreground">Calendar</h1>
      <p className="text-body-sm mb-6 max-w-2xl text-muted-foreground">
        Every arrival, departure, and preaching date across everyone currently being
        hosted.
      </p>

      {isLoading && <CalendarSkeleton />}

      {isError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the calendar</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {error && 'status' in error
              ? `The API returned an error (${error.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw className="size-3.5" />
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!isLoading && !isError && invitations && invitations.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <CalendarDays className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Nothing on the calendar</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Dates show up here once a minister has an active invitation.
          </p>
        </EmptyPanel>
      )}

      {!isLoading && !isError && invitations && invitations.length > 0 && (
        <div className="flex flex-col gap-8">
          {(arrivals.length > 0 || departures.length > 0) && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {arrivals.length > 0 && (
                <section>
                  <h2 className="text-heading-md mb-3 text-foreground">
                    Upcoming arrivals
                  </h2>
                  <div className="flex flex-col gap-2">
                    {arrivals.map((event) => (
                      <CalendarEventRow key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}
              {departures.length > 0 && (
                <section>
                  <h2 className="text-heading-md mb-3 text-foreground">
                    Upcoming departures
                  </h2>
                  <div className="flex flex-col gap-2">
                    {departures.map((event) => (
                      <CalendarEventRow key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {buckets.map((bucket) => (
              <section key={bucket.label}>
                <h2 className="text-heading-md mb-3 text-foreground">{bucket.label}</h2>
                <div className="flex flex-col gap-2">
                  {bucket.events.map((event) => (
                    <CalendarEventRow key={event.id} event={event} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}
