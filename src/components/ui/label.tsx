import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("text-sm font-semibold leading-none text-[#222222] dark:text-zinc-100", className)}
    {...props}
  />
));
Label.displayName = "Label";
