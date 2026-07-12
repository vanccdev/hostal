import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-[#ff385c] text-white",
      secondary: "bg-[#fff1f3] text-[#b0133e] dark:bg-[#3a1f27] dark:text-[#ffb3c0]",
      destructive: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
      outline: "border border-[#dddddd] text-[#222222] dark:border-[#3a3a3a] dark:text-zinc-200",
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
