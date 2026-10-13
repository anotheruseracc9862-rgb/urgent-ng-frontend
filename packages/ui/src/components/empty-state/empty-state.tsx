import * as React from "react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}
        {...props}
      >
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-panel text-muted">
            {icon}
          </div>
        )}
        <h3 className="text-base font-extrabold text-ink mb-2">{title}</h3>
        {description && <p className="text-sm text-muted max-w-sm mb-6">{description}</p>}
        {action}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
