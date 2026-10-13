import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  BadgeCheck,
  Circle,
  Clock3,
  Info,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";

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

const iconMap = {
  default: Circle,
  green: BadgeCheck,
  lime: Sparkles,
  blue: Info,
  amber: Clock3,
  red: XCircle,
  violet: AlertCircle,
  dark: ShieldCheck,
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  const Icon = iconMap[variant ?? "default"];
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      <span aria-hidden="true" className="inline-flex size-3.5 shrink-0 items-center justify-center">
        {icon ?? <Icon className="size-3.5" />}
      </span>
      {children}
    </span>
  );
}

export { badgeVariants };
