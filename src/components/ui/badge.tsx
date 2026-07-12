import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-[#c7a35a] text-[#102317]",
      secondary: "bg-[#f4ecd8] text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]",
      destructive: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
      outline: "border border-[#d8d4c8] text-[#18221b] dark:border-[#314237] dark:text-zinc-200",
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
