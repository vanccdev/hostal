import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-28 w-full rounded-xl border border-[#dddddd] bg-white px-4 py-3 text-sm text-[#222222] outline-none transition-shadow placeholder:text-[#717171] focus-visible:border-[#ff385c] focus-visible:ring-4 focus-visible:ring-[#ff385c]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100 dark:placeholder:text-[#b0b0b0]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
