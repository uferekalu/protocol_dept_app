import { addDays, isAfter, isBefore, isToday, isTomorrow, startOfDay } from 'date-fns';
import type { PopulatedInvitation } from '@/lib/types/invitation';

export type CalendarEventType = 'ARRIVAL' | 'DEPARTURE' | 'PREACHING';

export interface CalendarEvent {
  id: string;
  date: Date;
  type: CalendarEventType;
  invitation: PopulatedInvitation;
}

// Flattens every currently-hosted invitation into its dated events — one arrival, one
// departure, and one per preaching date — per brief Section 4D ("Calendar showing all
// ministers currently hosted, arrival/departure dates, and preaching dates").
// Chronologically sorted.
export function buildCalendarEvents(invitations: PopulatedInvitation[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const invitation of invitations) {
    events.push({
      id: `${invitation._id}-arrival`,
      date: new Date(invitation.arrival_date),
      type: 'ARRIVAL',
      invitation,
    });
    events.push({
      id: `${invitation._id}-departure`,
      date: new Date(invitation.departure_date),
      type: 'DEPARTURE',
      invitation,
    });
    invitation.preaching_dates.forEach((preachingDate) => {
      events.push({
        id: `${invitation._id}-preaching-${preachingDate}`,
        date: new Date(preachingDate),
        type: 'PREACHING',
        invitation,
      });
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface CalendarEventBucket {
  label: string;
  events: CalendarEvent[];
}

// Groups events into relative-day sections for the full agenda. Past events stay
// visible (a preaching date already ministered, an overdue arrival) rather than
// disappearing — useful context for a coordinator reviewing the whole stay, not just
// what's left.
export function groupEventsByBucket(events: CalendarEvent[]): CalendarEventBucket[] {
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 6);

  const order = ['Past', 'Today', 'Tomorrow', 'This Week', 'Later'] as const;
  const buckets: Record<(typeof order)[number], CalendarEvent[]> = {
    Past: [],
    Today: [],
    Tomorrow: [],
    'This Week': [],
    Later: [],
  };

  for (const event of events) {
    const day = startOfDay(event.date);
    if (isBefore(day, today)) {
      buckets.Past.push(event);
    } else if (isToday(day)) {
      buckets.Today.push(event);
    } else if (isTomorrow(day)) {
      buckets.Tomorrow.push(event);
    } else if (!isAfter(day, weekEnd)) {
      buckets['This Week'].push(event);
    } else {
      buckets.Later.push(event);
    }
  }

  return order.map((label) => ({ label, events: buckets[label] })).filter((b) => b.events.length > 0);
}

// Powers the "Upcoming arrivals" / "Upcoming departures" quick call-outs (brief Section
// 4D) — events of one type, due within the next `days`, soonest first. Arrivals are
// further narrowed to invitations still INVITED (an arrival that already happened —
// status has moved past INVITED — isn't "upcoming" anymore).
export function withinNextDays(
  events: CalendarEvent[],
  type: CalendarEventType,
  days: number,
): CalendarEvent[] {
  const cutoff = addDays(startOfDay(new Date()), days);
  return events
    .filter((event) => event.type === type && !isAfter(startOfDay(event.date), cutoff))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
