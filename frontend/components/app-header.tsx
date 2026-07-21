import { ThemeToggle } from '@/components/theme-toggle';
import { ActingAsPicker } from '@/components/acting-as-picker';

// Persistent top nav — required home for the theme toggle per frontend/CLAUDE.md, and
// for the "Acting as" auth stand-in (see acting-as-picker.tsx). Grows to hold real
// navigation (Dashboard, Ministers, Events, ...) as those screens are built; kept
// minimal for now since nothing exists to link to yet.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <span className="text-heading-md shrink-0 text-foreground">Protocol Department</span>
        <div className="flex items-center gap-2">
          <ActingAsPicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
