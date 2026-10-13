import * as React from "react";
import { cn } from "../../lib/utils";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id: string;
  label: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, id, label, hint, error, required, children, ...props }, ref) => {
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    return (
      <div ref={ref} className={cn("grid gap-[7px]", className)} {...props}>
        <label htmlFor={id} className="text-[12.5px] font-bold text-ink-2">
          {label}
          {required && <span aria-hidden="true" className="ml-1 text-red">*</span>}
          {required && <span className="sr-only"> (required)</span>}
        </label>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement<{ id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean }>(child)) {
            return child;
          }

          const describedBy = [
            child.props["aria-describedby"],
            hint ? hintId : undefined,
            error ? errorId : undefined,
          ]
            .filter(Boolean)
            .join(" ");

          return React.cloneElement(child, {
            id,
            "aria-describedby": describedBy || undefined,
            "aria-invalid": error ? true : child.props["aria-invalid"],
          });
        })}
        {hint && <p id={hintId} className="text-xs text-muted">{hint}</p>}
        {error && <p id={errorId} role="alert" className="text-xs font-semibold text-red">{error}</p>}
      </div>
    );
  },
);

Field.displayName = "Field";
