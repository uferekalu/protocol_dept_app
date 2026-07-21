import Link from 'next/link';
import { Mic, PlaneLanding, PlaneTakeoff } from 'lucide-react';
import type { CalendarEvent } from '@/lib/calendar';

const TYPE_CONFIG = {
  ARRIVAL: { icon: PlaneLanding, label: 'Arrival' },
  DEPARTURE: { icon: PlaneTakeoff, label: 'Departure' },
  PREACHING: { icon: Mic, label: 'Preaching' },
} as const;

export function CalendarEventRow({ event }: { event: CalendarEvent }) {
  const { icon: Icon, label } = TYPE_CONFIG[event.type];

  return (
    <Link
      href={`/invitations/${event.invitation._id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-medium text-foreground">
          {label} · {event.invitation.minister_id.full_name}
        </p>
        <p className="text-caption text-muted-foreground">{event.invitation.event_id.name}</p>
      </div>
      <p className="text-caption shrink-0 text-muted-foreground">
        {event.date.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </Link>
  );
}
