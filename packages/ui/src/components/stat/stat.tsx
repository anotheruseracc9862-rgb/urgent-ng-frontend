import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "../../lib/utils";

export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    trend: "up" | "down";
  };
  icon?: React.ReactNode;
}

export const Stat = React.forwardRef<HTMLDivElement, StatProps>(
  ({ className, label, value, delta, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-3.5 p-5 rounded-[var(--r-lg)] bg-surface shadow-[var(--shadow)]",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-muted">{label}</span>
          {icon}
        </div>
        <div className="flex items-end justify-between">
          <span className="text-[32px] font-extrabold tracking-tight leading-none">{value}</span>
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold",
                delta.trend === "up" ? "bg-ok-bg text-ok" : "bg-red-bg text-red"
              )}
            >
              {delta.trend === "up" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {delta.value}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Stat.displayName = "Stat";
