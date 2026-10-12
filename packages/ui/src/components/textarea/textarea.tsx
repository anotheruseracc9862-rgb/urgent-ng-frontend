import * as React from "react";
import { cn } from "../../lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full min-h-[110px] px-4 py-[13px] border border-line rounded-[var(--r-sm)] bg-surface text-sm resize-vertical transition-all",
          "focus:border-lime-600 focus:shadow-[0_0_0_4px_rgba(166,212,69,0.25)] focus:outline-none",
          error && "border-[#e4574a]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
