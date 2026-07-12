import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-12 w-full rounded-xl border border-[#d8d4c8] bg-white px-4 py-2 text-sm text-[#18221b] outline-none ring-offset-white transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#66736a] focus-visible:border-[#c7a35a] focus-visible:ring-4 focus-visible:ring-[#c7a35a]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100 dark:ring-offset-[#101a14] dark:placeholder:text-[#b7c0b4]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
