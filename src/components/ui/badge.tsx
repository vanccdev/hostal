import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md px-2 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950",
      secondary: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
      destructive: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
      outline: "border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
