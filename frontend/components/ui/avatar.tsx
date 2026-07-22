import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'size-8 text-caption',
  md: 'size-10 text-body-sm',
  lg: 'size-16 text-heading-md',
} as const;

// Shared avatar for anywhere a ProtocolMember is shown by name — the member directory
// list and the profile page. Shows their uploaded photo (image_url, once the Cloudinary
// upload UI lands) or falls back to their initials over a brand-tinted circle.
function Avatar({
  imageUrl,
  name,
  size = 'md',
  className,
}: {
  imageUrl?: string;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        className={cn('shrink-0 rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden
    >
      {initials || <User className="size-1/2" />}
    </div>
  );
}

export { Avatar };
