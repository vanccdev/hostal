import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-12 w-full rounded-xl border border-[#dddddd] bg-white px-4 py-2 text-sm text-[#222222] outline-none ring-offset-white transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#717171] focus-visible:border-[#ff385c] focus-visible:ring-4 focus-visible:ring-[#ff385c]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100 dark:ring-offset-[#151515] dark:placeholder:text-[#b0b0b0]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
