import * as React from "react";
import { cn } from "../../lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn("text-[12.5px] font-bold text-ink-2", className)}
        {...props}
      >
        {children}
      </label>
    );
  }
);

Label.displayName = "Label";
