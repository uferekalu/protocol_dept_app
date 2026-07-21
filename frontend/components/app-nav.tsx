'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Grows as more screens land (Events, Calendar, Reports). A horizontally-scrolling tab
// row rather than a hamburger drawer — simple, and holds up fine as more links get
// added, without building a mobile drawer. Invitations has no top-level tab by design —
// it's reached through a minister's profile, not browsed independently.
const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/ministers', label: 'Ministers' },
  { href: '/assignments', label: 'Assignments' },
  { href: '/my-assignments', label: 'My Assignments' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-14 z-30 border-b border-border bg-background"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-4">
        {NAV_LINKS.map((link) => {
          const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-body-sm shrink-0 border-b-2 px-3 py-2.5 font-medium whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
