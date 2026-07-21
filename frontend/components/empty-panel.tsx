// Shared shell for empty/error states across screens: a soft brand-colored glow
// behind an icon badge, rather than a bare gray icon on a blank box. Extracted from
// the Dashboard so every list screen gets the same treatment, not a re-invented one.
export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 relative overflow-hidden rounded-2xl border border-border bg-card py-16 text-center motion-safe:duration-500 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-4 px-6">{children}</div>
    </div>
  );
}

export function IconBadge({
  tone,
  children,
}: {
  tone: 'primary' | 'destructive';
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        tone === 'primary'
          ? 'flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20'
          : 'flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20'
      }
    >
      {children}
    </div>
  );
}
