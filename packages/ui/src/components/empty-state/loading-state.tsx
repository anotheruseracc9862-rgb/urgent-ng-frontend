import * as React from "react";
import { Skeleton } from "../skeleton";
import { cn } from "../../lib/utils";

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  lines?: number;
}

export function LoadingState({
  className,
  label = "Loading",
  lines = 3,
  ...props
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("grid gap-3 rounded-[var(--r-lg)] bg-surface p-5 shadow-[var(--shadow)]", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: Math.max(0, lines) }, (_, index) => (
        <Skeleton key={index} className={cn("h-4", index === lines - 1 ? "w-1/2" : "w-full")} />
      ))}
    </div>
  );
}
