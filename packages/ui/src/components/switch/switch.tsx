import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "relative inline-flex h-11 w-[46px] shrink-0 cursor-pointer items-center rounded-full bg-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-600/45 focus-visible:ring-offset-2",
        "after:absolute after:inset-x-0 after:top-[9px] after:h-[26px] after:rounded-full after:bg-[#d4dad0] after:transition-colors",
        "data-[state=checked]:after:bg-green disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none relative z-10 block size-5 translate-x-[3px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform",
          "data-[state=checked]:translate-x-[23px]"
        )}
      />
    </SwitchPrimitive.Root>
  ),
);

Switch.displayName = "Switch";
