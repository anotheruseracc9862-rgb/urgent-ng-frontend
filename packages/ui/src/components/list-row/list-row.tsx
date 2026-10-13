import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/utils";

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export function ListRow({ asChild = false, className, ...props }: ListRowProps) {
  const classes = cn(
    "flex min-h-[64px] items-center gap-3.5 border-t border-line-2 px-1 py-3.5 first:border-t-0",
    asChild && "rounded-[var(--r-sm)] transition-colors hover:bg-panel focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-600/45",
    className,
  );

  return asChild
    ? <Slot className={classes} {...props} />
    : <div className={classes} {...props} />;
}

export const ListRowContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("min-w-0 flex-1", className)} {...props} />
  ),
);
ListRowContent.displayName = "ListRowContent";

export const ListRowTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("truncate text-sm font-bold text-ink", className)} {...props} />
  ),
);
ListRowTitle.displayName = "ListRowTitle";

export const ListRowDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("truncate text-[12.5px] text-muted", className)} {...props} />
  ),
);
ListRowDescription.displayName = "ListRowDescription";

export const ListRowAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex shrink-0 items-center gap-2", className)} {...props} />
  ),
);
ListRowAction.displayName = "ListRowAction";
