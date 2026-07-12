"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { es } from "react-day-picker/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export const Calendar = ({ className, classNames, showOutsideDays = true, locale = es, ...props }: CalendarProps) => (
  <DayPicker
    locale={locale}
    showOutsideDays={showOutsideDays}
    className={cn("w-full p-1", className)}
    classNames={{
      root: "relative w-full",
      months: "flex flex-col gap-4",
      month: "space-y-4",
      month_caption: "flex h-10 items-center justify-center px-10",
      caption_label: "text-sm font-semibold capitalize",
      nav: "absolute inset-x-0 top-4 flex items-center justify-between px-4",
      button_previous:
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d8d4c8] bg-white text-[#18221b] hover:border-[#18221b] dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100",
      button_next:
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d8d4c8] bg-white text-[#18221b] hover:border-[#18221b] dark:border-[#314237] dark:bg-[#18251d] dark:text-zinc-100",
      month_grid: "w-full table-fixed border-collapse",
      weekdays: "grid grid-cols-7",
      weekday: "h-8 text-center text-[0.8rem] font-semibold text-[#66736a] dark:text-[#b7c0b4]",
      weeks: "grid gap-1",
      week: "grid grid-cols-7 gap-1",
      day: "relative flex h-9 w-9 items-center justify-center p-0 text-center text-sm",
      day_button:
        "h-9 w-9 rounded-full text-sm font-medium transition-colors hover:bg-[#f4ecd8] focus:outline-none focus:ring-2 focus:ring-[#c7a35a] dark:hover:bg-[#223229]",
      selected:
        "[&>button]:!bg-[#c7a35a] [&>button]:!text-[#102317] [&>button]:hover:!bg-[#a9822f] [&>button]:hover:!text-white [&>button]:focus:!bg-[#a9822f] [&>button]:focus:!text-white",
      today: "[&>button]:border [&>button]:border-[#c7a35a]",
      outside: "text-[#b7c0b4] opacity-50 dark:text-[#66736a]",
      disabled: "text-[#b7c0b4] opacity-50 dark:text-[#66736a]",
      hidden: "invisible",
      ...classNames,
    }}
    components={{
      Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) =>
        orientation === "left" ? (
          <ChevronLeft className={cn("h-4 w-4", chevronClassName)} aria-hidden="true" {...chevronProps} />
        ) : (
          <ChevronRight className={cn("h-4 w-4", chevronClassName)} aria-hidden="true" {...chevronProps} />
        ),
    }}
    {...props}
  />
);
Calendar.displayName = "Calendar";
