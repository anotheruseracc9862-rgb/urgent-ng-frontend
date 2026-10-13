import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-[13.5px] font-bold transition-[transform,box-shadow,background-color,color] duration-200 active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-lime-600/45 focus-visible:ring-offset-2 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-lime text-ink shadow-[0_4px_14px_rgba(166,212,69,0.35)] hover:-translate-y-0.5 hover:bg-lime-600 hover:shadow-[0_10px_24px_-4px_rgba(166,212,69,0.45)] after:pointer-events-none after:absolute after:-top-1/2 after:-left-3/4 after:h-[200%] after:w-1/2 after:rotate-[25deg] after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent after:transition-[left] after:duration-700 hover:after:left-[140%]",
        dark: "bg-ink text-white hover:bg-[#0f1822]",
        ghost: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:-translate-y-px hover:bg-panel",
        soft: "bg-panel text-ink hover:bg-tint-2",
        danger: "bg-red-bg text-red hover:bg-[#ffe1dc]",
      },
      size: {
        default: "min-h-[44px] px-5",
        sm: "min-h-11 px-3.5 text-[12.5px] sm:min-h-[36px]",
        lg: "min-h-[52px] px-7 text-[14.5px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export type ButtonProps =
  | (ButtonBaseProps & { asChild?: false; isLoading?: boolean })
  | (ButtonBaseProps & { asChild: true; isLoading?: never });

export function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const sharedProps = {
    className: cn(buttonVariants({ variant, size, className })),
    "aria-busy": isLoading || undefined,
    ...props,
  };

  if (asChild) {
    return <Comp {...sharedProps} />;
  }

  return (
    <button
      {...sharedProps}
      disabled={isLoading || props.disabled}
    >
      {isLoading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {props.children}
    </button>
  );
}

export { buttonVariants };
