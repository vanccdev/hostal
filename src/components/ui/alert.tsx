import * as React from "react";
import { cn } from "@/lib/utils";

export const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(
        "rounded-2xl border border-[#dddddd] bg-white p-4 text-sm text-[#222222] shadow-[0_8px_24px_rgba(0,0,0,0.06)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100",
        className,
      )}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-normal", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-[#717171] dark:text-[#b0b0b0]", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";
