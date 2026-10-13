import * as React from "react";
import { cn } from "../../lib/utils";

export const KeyValue = React.forwardRef<HTMLDListElement, React.HTMLAttributes<HTMLDListElement>>(
  ({ className, ...props }, ref) => (
    <dl ref={ref} className={cn("grid gap-0", className)} {...props} />
  ),
);
KeyValue.displayName = "KeyValue";

export const KeyValueItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line-2 py-3 first:border-t-0", className)} {...props} />
  ),
);
KeyValueItem.displayName = "KeyValueItem";

export const KeyValueTerm = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <dt ref={ref} className={cn("text-[12.5px] text-muted", className)} {...props} />
  ),
);
KeyValueTerm.displayName = "KeyValueTerm";

export const KeyValueValue = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <dd ref={ref} className={cn("text-right text-[13px] font-bold text-ink", className)} {...props} />
  ),
);
KeyValueValue.displayName = "KeyValueValue";
