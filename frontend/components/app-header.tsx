import Image from 'next/image';
import { ThemeToggle } from '@/components/theme-toggle';
import { ActingAsPicker } from '@/components/acting-as-picker';

// Persistent top nav — required home for the theme toggle per frontend/CLAUDE.md, and
// for the "Acting as" auth stand-in (see acting-as-picker.tsx). Grows to hold real
// navigation (Dashboard, Ministers, Events, ...) as those screens are built; kept
// minimal for now since nothing exists to link to yet.
//
// Mobile note: the wordmark is dropped below `sm` — the crest alone is a strong
// enough anchor at that width, and it's what buys back the room the "Acting as"
// picker needs on a narrow phone screen (the actual field context this app is used
// in, per frontend/CLAUDE.md).
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/pcn-logo.png"
            alt="Presbyterian Church of Nigeria"
            width={57}
            height={40}
            priority
            className="h-8 w-auto shrink-0 sm:h-9"
          />
          <span className="text-heading-md hidden truncate text-foreground sm:inline">
            Protocol Department
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ActingAsPicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
