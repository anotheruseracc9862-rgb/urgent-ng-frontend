import * as React from "react";
import { cn } from "../../lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  error?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("grid gap-[7px]", className)} {...props}>
        {children}
        {error && <FormError>{error}</FormError>}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export const FormError = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-red text-xs font-semibold", className)}
        {...props}
      />
    );
  }
);

FormError.displayName = "FormError";

export const FormHint = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-muted text-xs", className)}
        {...props}
      />
    );
  }
);

FormHint.displayName = "FormHint";
