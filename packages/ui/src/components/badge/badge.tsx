import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-panel text-ink-2",
        green: "bg-ok-bg text-ok",
        lime: "bg-tint-2 text-green-900",
        blue: "bg-blue-bg text-blue",
        amber: "bg-amber-bg text-amber",
        red: "bg-red-bg text-red",
        violet: "bg-violet-bg text-violet",
        dark: "bg-ink text-lime",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
