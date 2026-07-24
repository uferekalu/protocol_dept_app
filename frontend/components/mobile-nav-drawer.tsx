'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  CalendarRange,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { isElevatedRole } from '@/lib/constants/protocol-member';
import { cn } from '@/lib/utils';

// Mirrors app-nav.tsx's link list — kept as a separate array (not shared) since the
// two components' link shape differs (this one needs an icon per link, the desktop
// tab row doesn't). Assignments (the board) is ADMIN/COORDINATOR-only on the backend —
// a MEMBER's equivalent is "My Assignments", which stays visible to everyone.
const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ministers', label: 'Ministers', icon: UserRound },
  { href: '/events', label: 'Events', icon: CalendarRange },
  { href: '/assignments', label: 'Assignments', icon: ClipboardList, elevatedOnly: true },
  { href: '/my-assignments', label: 'My Assignments', icon: ListChecks },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: ScrollText },
  { href: '/team', label: 'Team', icon: Users },
];

const STORAGE_KEY = 'protocol-department:mobile-nav-expanded';

// Below `sm` only (see app-nav.tsx, which is desktop/tablet-only) — a collapsible
// icon-rail sidebar flush against the left edge, replacing the horizontal tab row on
// narrow phone screens per user feedback. Spans the full viewport height below the
// header. Collapsed, it sits side-by-side with page content (content reserves exactly
// its width via the `pl-14` wrapper in app/providers.tsx, so nothing is ever covered).
// Expanded, it widens past that reserved width and overlays on top of content instead
// of pushing/resizing it — the reserved width never changes, only the rail's own width
// does, which is what makes the extra width read as an overlay rather than a layout
// shift.
export function MobileNavDrawer() {
  const pathname = usePathname();
  const { data: currentUser } = useCurrentUser();
  const canManage = isElevatedRole(currentUser?.role);
  const links = NAV_LINKS.filter((link) => !link.elevatedOnly || canManage);
  const [expanded, setExpanded] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Hydrate the user's last preference from localStorage on mount only — starts
  // collapsed during SSR/first paint to avoid a hydration mismatch (no localStorage on
  // the server), same pattern as acting-as-picker.tsx.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Deliberate one-time sync from an external store (localStorage) on mount, not a
    // derived-state anti-pattern — unavoidable here since reading localStorage during
    // the initial render would mismatch the server-rendered (collapsed) markup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === 'true') setExpanded(true);
  }, []);

  function setExpandedAndPersist(next: boolean) {
    setExpanded(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }

  function toggle() {
    setExpandedAndPersist(!expanded);
  }

  // Close on an outside click/tap — better mobile UX than requiring the user to find
  // the chevron again. Only listens while expanded (nothing to close otherwise), and
  // checks containment against the nav element itself rather than a "did you click a
  // link" heuristic, so it also closes on a tap anywhere else in the page (including
  // the header/overlaid content), not just link navigation.
  useEffect(() => {
    if (!expanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setExpandedAndPersist(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [expanded]);

  // No confirmed identity, no drawer — same reasoning as app-nav.tsx (matches
  // UserMenu's own signal, not a raw token check that can go stale). Placed after
  // every hook above so the hook call order never changes between renders (React's
  // rules of hooks).
  if (!currentUser) return null;

  return (
    <nav
      ref={navRef}
      aria-label="Primary"
      className={cn(
        'fixed top-14 bottom-0 left-0 z-40 flex flex-col overflow-hidden bg-card text-card-foreground shadow-md ring-1 ring-foreground/10 transition-[width] duration-200 ease-out sm:hidden',
        expanded ? 'w-56' : 'w-14',
      )}
    >
      <div className="flex flex-col gap-1 p-2">
        {links.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-label={link.label}
              onClick={() => setExpandedAndPersist(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg py-2.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                expanded ? 'px-2.5' : 'justify-center',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span
                className={cn(
                  'text-body-sm overflow-hidden font-medium whitespace-nowrap transition-opacity duration-150',
                  expanded ? 'opacity-100 delay-100' : 'w-0 opacity-0',
                )}
              >
                {link.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Flexible spacer — pins the toggle to the bottom of the full-height rail
          regardless of viewport height. */}
      <div className="flex-1" />

      {/* Left-aligned (matching the icon column above) when expanded, per the reference
          screenshot — centered when collapsed, same as the nav icons above it. */}
      <div className={cn('flex border-t border-border p-2', expanded ? 'justify-start' : 'justify-center')}>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        >
          {expanded ? <ChevronsLeft className="size-4" /> : <ChevronsRight className="size-4" />}
        </Button>
      </div>
    </nav>
  );
}
