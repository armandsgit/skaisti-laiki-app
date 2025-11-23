import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-0 px-3 py-1 text-xs font-semibold transition-all duration-150 shadow-sm active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft active:shadow-hover",
        secondary: "bg-secondary text-secondary-foreground active:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground active:bg-destructive/80 shadow-card",
        outline: "text-foreground border-2 border-border active:border-primary/50 active:bg-primary-soft",
        success: "bg-success text-white shadow-card active:opacity-90",
        warning: "bg-warning text-white shadow-card active:opacity-90",
        premium: "bg-primary text-primary-foreground shadow-glow active:shadow-hover",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
