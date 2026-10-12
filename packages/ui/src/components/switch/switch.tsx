import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, ...props }, ref) => {
    return (
      <label className={cn("relative inline-block shrink-0 w-[46px] h-[26px]", className)}>
        <input
          type="checkbox"
          ref={ref}
          className="absolute inset-0 w-full h-full m-0 opacity-0 cursor-pointer z-10 peer"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-[#d4dad0] transition-colors peer-checked:bg-green peer-disabled:opacity-50 peer-disabled:cursor-not-allowed">
          <span className="absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform peer-checked:translate-x-5" />
        </span>
      </label>
    );
  }
);

Switch.displayName = "Switch";
