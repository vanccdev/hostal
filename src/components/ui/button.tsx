import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a35a] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-[#101a14]",
  {
    variants: {
      variant: {
        default: "bg-[#c7a35a] text-[#102317] shadow-[0_6px_18px_rgba(199,163,90,0.28)] hover:bg-[#a9822f] hover:text-white",
        destructive: "bg-red-600 text-white shadow-[0_6px_18px_rgba(220,38,38,0.22)] hover:bg-red-700",
        outline:
          "border border-[#d8d4c8] bg-white text-[#18221b] hover:border-[#18221b] hover:bg-white dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100 dark:hover:border-zinc-200",
        secondary: "bg-[#f6f1e6] text-[#18221b] hover:bg-[#ece4d4] dark:bg-[#223229] dark:text-zinc-100 dark:hover:bg-[#2a3b31]",
        ghost: "text-[#18221b] hover:bg-[#f6f1e6] dark:text-zinc-100 dark:hover:bg-[#223229]",
        link: "h-auto rounded-none px-0 py-0 text-[#18221b] underline-offset-4 hover:underline dark:text-zinc-100",
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
