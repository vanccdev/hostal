import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-28 w-full rounded-xl border border-[#d8d4c8] bg-white px-4 py-3 text-sm text-[#18221b] outline-none transition-shadow placeholder:text-[#66736a] focus-visible:border-[#c7a35a] focus-visible:ring-4 focus-visible:ring-[#c7a35a]/15 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100 dark:placeholder:text-[#b7c0b4]",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
