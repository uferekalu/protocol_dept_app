import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        pending: "bg-status-pending text-status-pending-foreground",
        "in-progress": "bg-status-in-progress text-status-in-progress-foreground",
        complete: "bg-status-complete text-status-complete-foreground",
      },
      size: {
        default: "text-label px-2.5 py-1",
        sm: "text-caption px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
