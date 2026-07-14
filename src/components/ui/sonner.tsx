"use client";

import { CircleCheck, Info, LoaderCircle, OctagonX, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group z-[100]"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-[#d8d4c8] group-[.toaster]:bg-[#fffdf7] group-[.toaster]:text-[#18221b] group-[.toaster]:shadow-lg dark:group-[.toaster]:border-[#314237] dark:group-[.toaster]:bg-[#18251d] dark:group-[.toaster]:text-[#f6f1e6]",
          description: "group-[.toast]:text-[#66736a] dark:group-[.toast]:text-[#b7c0b4]",
          actionButton:
            "group-[.toast]:bg-[#c7a35a] group-[.toast]:text-[#102317]",
          cancelButton:
            "group-[.toast]:bg-[#f6f1e6] group-[.toast]:text-[#66736a] dark:group-[.toast]:bg-[#223229] dark:group-[.toast]:text-[#b7c0b4]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
