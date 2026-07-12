"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 8, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-2xl border border-[#dddddd] bg-white p-3 text-[#222222] shadow-[0_12px_32px_rgba(0,0,0,0.14)] outline-none dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
