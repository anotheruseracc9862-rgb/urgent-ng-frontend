import * as React from "react";
import { cn } from "../../lib/utils";

export const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex min-h-12 w-full items-center overflow-hidden rounded-[var(--r-sm)] border border-line bg-surface",
        "focus-within:border-lime-600 focus-within:shadow-[0_0_0_4px_rgba(166,212,69,0.25)]",
        "[&_input]:min-h-12 [&_input]:flex-1 [&_input]:border-0 [&_input]:shadow-none [&_input]:focus-visible:shadow-none",
        className,
      )}
      {...props}
    />
  ),
);
InputGroup.displayName = "InputGroup";

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLSpanElement> {
  align?: "start" | "end";
}

export const InputGroupAddon = React.forwardRef<HTMLSpanElement, InputGroupAddonProps>(
  ({ align = "start", className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "flex min-h-12 shrink-0 items-center px-4 text-sm font-bold text-muted",
        align === "end" && "order-1",
        className,
      )}
      {...props}
    />
  ),
);
InputGroupAddon.displayName = "InputGroupAddon";
