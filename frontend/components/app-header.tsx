import { ThemeToggle } from '@/components/theme-toggle';

// Persistent top nav — required home for the theme toggle per frontend/CLAUDE.md.
// Grows to hold real navigation (Dashboard, Ministers, Events, ...) as those screens
// are built; kept minimal for now since nothing exists to link to yet.
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <span className="text-heading-md text-foreground">Protocol Department</span>
        <ThemeToggle />
      </div>
    </header>
  );
}
