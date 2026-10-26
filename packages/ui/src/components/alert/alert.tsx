import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "flex items-start gap-3 px-4 py-3.5 rounded-[var(--r)] text-[13px] leading-[1.55]",
  {
    variants: {
      variant: {
        default: "bg-panel text-ink-2",
        info: "bg-blue-bg text-[#1b3f8f]",
        warn: "bg-amber-bg text-[#7a4800]",
        danger: "bg-red-bg text-[#8f2a22]",
        ok: "bg-ok-bg text-[#145c30]",
        lime: "bg-tint text-green-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const iconMap = {
  default: Info,
  info: Info,
  warn: AlertTriangle,
  danger: AlertCircle,
  ok: CheckCircle,
  lime: Info,
};

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: React.ComponentType<{ className?: string }>;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, icon, children, ...props }, ref) => {
    const Icon = icon || iconMap[variant || "default"];
    const own = React.useRef<HTMLDivElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        own.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // An error that appears below the fold looks like nothing happened, most of all on a phone, where the
    // button just pressed and the error can be a screen apart. Bring it into view; it only scrolls when it
    // is not already visible.
    const isError = props.role === "alert" && variant === "danger";
    React.useEffect(() => {
      const node = own.current;
      if (isError && node && typeof node.scrollIntoView === "function") {
        node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }, [isError]);

    return (
      <div ref={setRefs} className={cn(alertVariants({ variant }), className)} {...props}>
        <Icon className="shrink-0 mt-0.5 w-4 h-4" />
        <div className="flex-1">{children}</div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { alertVariants };
