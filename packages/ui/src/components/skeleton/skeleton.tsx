import * as React from "react";
import { cn } from "../../lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("animate-pulse rounded-[var(--r-sm)] bg-line", className)}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";
