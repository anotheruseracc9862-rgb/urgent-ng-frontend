import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[13.5px] font-bold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-600/45 focus-visible:ring-offset-2 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-lime text-ink hover:bg-lime-600",
        dark: "bg-ink text-white hover:bg-[#0f1822]",
        ghost: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-panel",
        soft: "bg-panel text-ink hover:bg-tint-2",
        danger: "bg-red-bg text-red hover:bg-[#ffe1dc]",
      },
      size: {
        default: "min-h-[44px] px-5",
        sm: "min-h-[36px] px-3.5 text-[12.5px]",
        lg: "min-h-[52px] px-7 text-[14.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
