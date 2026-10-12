import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const avatarVariants = cva(
  "grid place-items-center rounded-full font-extrabold shrink-0",
  {
    variants: {
      size: {
        sm: "w-8 h-8 text-[11px]",
        default: "w-10 h-10 text-[13px]",
        lg: "w-14 h-14 text-lg",
        xl: "w-[84px] h-[84px] text-[26px]",
      },
      variant: {
        default: "bg-tint-2 text-green-900",
        violet: "bg-violet-bg text-violet",
        amber: "bg-amber-bg text-amber",
        blue: "bg-blue-bg text-blue",
        dark: "bg-ink text-lime",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  },
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  initials?: string;
  src?: string;
  alt?: string;
}

export function Avatar({ className, size, variant, initials, src, alt, children, ...props }: AvatarProps) {
  if (src) {
    return (
      <div className={cn(avatarVariants({ size, variant }), "overflow-hidden", className)} {...props}>
        <img src={src} alt={alt || ""} className="w-full h-full object-cover" />
      </div>
    );
  }
  
  return (
    <div className={cn(avatarVariants({ size, variant }), className)} {...props}>
      {initials || children}
    </div>
  );
}

export { avatarVariants };
