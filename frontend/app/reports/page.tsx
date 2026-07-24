'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CalendarClock, ChevronRight, ScrollText, Trophy, Users } from 'lucide-react';
import { useGetReportsHistoryQuery, useGetReportsStatsQuery } from '@/lib/redux/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyPanel, IconBadge } from '@/components/empty-panel';
import { STATUS_LABELS } from '@/lib/constants/invitation-status';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Reports & History — brief Section 4F "Reporting & History" / screen 12. Read-only
// (open to any authenticated role, same as every other GET in this app): a past-events
// archive (every invitation ever created, linking into its existing status-timeline
// page for full logs) plus a few simple stats computed server-side from that same
// data. "Exportable minister list per event" lives on /events/[id] instead — that's
// where a Coordinator already has the relevant event selected.
export default function ReportsPage() {
  const router = useRouter();
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useGetReportsStatsQuery();
  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    error: historyErrorDetail,
    refetch: refetchHistory,
  } = useGetReportsHistoryQuery();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-heading-lg text-foreground">Reports & History</h1>
        <p className="text-body-sm max-w-2xl text-muted-foreground">
          Simple stats and the full historical archive of every invitation.
        </p>
      </div>

      {statsLoading && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}

      {!statsLoading && statsError && (
        <p className="text-body-sm mb-8 rounded-xl border border-border bg-card p-4 text-center text-muted-foreground">
          Couldn&apos;t load stats. The history archive below still works.
        </p>
      )}

      {!statsLoading && stats && (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<CalendarClock className="size-5" />}
            title="Avg. Pickup → Check-in"
          >
            {stats.average_pickup_to_checkin_hours === null ? (
              <p className="text-body-sm text-muted-foreground">Not enough data yet.</p>
            ) : (
              <p className="text-heading-lg text-foreground">
                {stats.average_pickup_to_checkin_hours.toFixed(1)}
                <span className="text-body-sm ml-1 font-normal text-muted-foreground">hours</span>
              </p>
            )}
          </StatCard>

          <StatCard icon={<Trophy className="size-5" />} title="Most Active Protocol Members">
            {stats.most_active_protocol_members.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No status updates logged yet.</p>
            ) : (
              <RankedList
                items={stats.most_active_protocol_members.slice(0, 5).map((member) => ({
                  key: member.protocol_member_id,
                  label: member.full_name,
                  value: `${member.status_update_count} update${member.status_update_count === 1 ? '' : 's'}`,
                }))}
              />
            )}
          </StatCard>

          <StatCard icon={<Users className="size-5" />} title="Days Hosted per Minister">
            {stats.days_hosted_per_minister.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">No invitations yet.</p>
            ) : (
              <RankedList
                items={stats.days_hosted_per_minister.slice(0, 5).map((minister) => ({
                  key: minister.minister_id,
                  label: minister.full_name,
                  value: `${minister.total_days} day${minister.total_days === 1 ? '' : 's'}`,
                }))}
              />
            )}
          </StatCard>
        </div>
      )}

      <h2 className="text-heading-md mb-3 text-foreground">History archive</h2>

      {historyLoading && (
        <div className="overflow-hidden rounded-xl border border-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border p-3 last:border-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="hidden h-4 w-1/4 sm:block" />
              <Skeleton className="hidden h-4 w-1/6 md:block" />
            </div>
          ))}
        </div>
      )}

      {historyError && (
        <EmptyPanel>
          <IconBadge tone="destructive">
            <AlertTriangle className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">Couldn&apos;t load the history archive</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            {historyErrorDetail && 'status' in historyErrorDetail
              ? `The API returned an error (${historyErrorDetail.status}). Check the backend is running.`
              : 'Something went wrong reaching the API.'}
          </p>
          <Button variant="outline" onClick={() => refetchHistory()} className="mt-1">
            Try again
          </Button>
        </EmptyPanel>
      )}

      {!historyLoading && !historyError && history && history.length === 0 && (
        <EmptyPanel>
          <IconBadge tone="primary">
            <ScrollText className="size-7" />
          </IconBadge>
          <p className="text-heading-md text-foreground">No invitations yet</p>
          <p className="text-body-sm max-w-sm text-muted-foreground">
            Past events and ministers hosted will show up here once invitations exist.
          </p>
        </EmptyPanel>
      )}

      {!historyLoading && !historyError && history && history.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Minister</TableHead>
                <TableHead className="hidden sm:table-cell">Event</TableHead>
                <TableHead className="hidden md:table-cell">Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((invitation) => (
                <TableRow
                  key={invitation._id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/invitations/${invitation._id}`)}
                >
                  <TableCell className="whitespace-normal">
                    <Link
                      href={`/invitations/${invitation._id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {invitation.minister_id.full_name}
                    </Link>
                    <p className="text-caption text-muted-foreground sm:hidden">
                      {invitation.event_id.name}
                    </p>
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
                    {invitation.event_id.name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {new Date(invitation.arrival_date).toLocaleDateString()} –{' '}
                    {new Date(invitation.departure_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge>{STATUS_LABELS[invitation.status]}</Badge>
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

function StatCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-label">{title}</p>
      </div>
      {children}
    </div>
  );
}

function RankedList({ items }: { items: { key: string; label: string; value: string }[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={item.key} className="text-body-sm flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-foreground">
            {index + 1}. {item.label}
          </span>
          <span className="shrink-0 text-muted-foreground">{item.value}</span>
        </li>
      ))}
    </ol>
  );
}
