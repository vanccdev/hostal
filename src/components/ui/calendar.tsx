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
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[#222222] hover:border-[#222222] dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100",
      button_next:
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dddddd] bg-white text-[#222222] hover:border-[#222222] dark:border-[#3a3a3a] dark:bg-[#1f1f1f] dark:text-zinc-100",
      month_grid: "w-full table-fixed border-collapse",
      weekdays: "grid grid-cols-7",
      weekday: "h-8 text-center text-[0.8rem] font-semibold text-[#717171] dark:text-[#b0b0b0]",
      weeks: "grid gap-1",
      week: "grid grid-cols-7 gap-1",
      day: "relative flex h-9 w-9 items-center justify-center p-0 text-center text-sm",
      day_button:
        "h-9 w-9 rounded-full text-sm font-medium transition-colors hover:bg-[#fff1f3] focus:outline-none focus:ring-2 focus:ring-[#ff385c] dark:hover:bg-[#2b2b2b]",
      selected:
        "[&>button]:!bg-[#ff385c] [&>button]:!text-white [&>button]:hover:!bg-[#e31c5f] [&>button]:hover:!text-white [&>button]:focus:!bg-[#e31c5f] [&>button]:focus:!text-white",
      today: "[&>button]:border [&>button]:border-[#ff385c]",
      outside: "text-[#b0b0b0] opacity-50 dark:text-[#717171]",
      disabled: "text-[#b0b0b0] opacity-50 dark:text-[#717171]",
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
