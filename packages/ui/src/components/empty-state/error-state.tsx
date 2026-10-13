import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "../button";
import { cn } from "../../lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({
  className,
  title = "We could not load this",
  message,
  requestId,
  onRetry,
  ...props
}: ErrorStateProps) {
  const headingId = React.useId();
  return (
    <section
      role="alert"
      aria-labelledby={headingId}
      className={cn("grid justify-items-start gap-3 rounded-[var(--r-lg)] bg-red-bg p-5 text-red", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <AlertCircle aria-hidden="true" className="size-5 shrink-0" />
        <h2 id={headingId} className="font-extrabold">{title}</h2>
      </div>
      <p className="text-sm">{message}</p>
      {requestId && <p className="text-xs">Request ID: <code>{requestId}</code></p>}
      {onRetry && <Button variant="ghost" onClick={onRetry}>Try again</Button>}
    </section>
  );
}
