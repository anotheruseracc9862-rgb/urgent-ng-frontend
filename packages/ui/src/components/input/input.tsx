import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "w-full min-h-[48px] px-4 border border-line rounded-[var(--r-sm)] bg-surface text-sm transition-all",
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

Input.displayName = "Input";
