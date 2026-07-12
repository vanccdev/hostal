import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff385c] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-[#151515]",
  {
    variants: {
      variant: {
        default: "bg-[#ff385c] text-white shadow-[0_6px_18px_rgba(255,56,92,0.28)] hover:bg-[#e31c5f]",
        destructive: "bg-red-600 text-white shadow-[0_6px_18px_rgba(220,38,38,0.22)] hover:bg-red-700",
        outline:
          "border border-[#dddddd] bg-white text-[#222222] hover:border-[#222222] hover:bg-white dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100 dark:hover:border-zinc-200",
        secondary: "bg-[#f7f7f7] text-[#222222] hover:bg-[#ebebeb] dark:bg-[#2b2b2b] dark:text-zinc-100 dark:hover:bg-[#333333]",
        ghost: "text-[#222222] hover:bg-[#f7f7f7] dark:text-zinc-100 dark:hover:bg-[#2b2b2b]",
        link: "h-auto rounded-none px-0 py-0 text-[#222222] underline-offset-4 hover:underline dark:text-zinc-100",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { buttonVariants };
