import { cn } from '@/lib/utils';
import { STATUS_LABELS, STATUS_ORDER } from '@/lib/constants/invitation-status';
import type { InvitationStatus } from '@/lib/types/invitation';

// Genuinely visual pipeline position, not just a colored text badge, per
// frontend/CLAUDE.md — a segmented bar (one segment per canonical stage) plus the
// current stage's human-readable label, so it doesn't rely on color alone.
//
// The repeating preaching sub-cycle (EN_ROUTE_TO_VENUE / AT_VENUE_MINISTERING /
// RETURNED_TO_HOTEL) always maps to the same three segments regardless of which lap
// the invitation is actually on — a full lap-by-lap history belongs to the Status
// Timeline screen, not this compact card view.
export function StatusStepper({ status }: { status: InvitationStatus }) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1" role="img" aria-label={`Status: ${STATUS_LABELS[status]}`}>
        {STATUS_ORDER.map((step, index) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= currentIndex ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-body-sm font-medium text-foreground">{STATUS_LABELS[status]}</p>
    </div>
  );
}
