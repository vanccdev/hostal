"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localISODate } from "@/lib/datetime";

type ResponsiveDateRangePickerFieldProps = {
  startId: string;
  endId: string;
  startName: string;
  endName: string;
  startValue?: string;
  endValue?: string;
  onChange?: (range: { from: string; to: string }) => void;
  disablePast?: boolean;
  required?: boolean;
  placeholder?: string;
};

const dateFromValue = (value?: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const dateToValue = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");

const displayDate = (date?: Date) => (date ? format(date, "dd/MM/yyyy") : "");

const todayInAppTimeZone = () => dateFromValue(localISODate(new Date())) ?? new Date();

export const ResponsiveDateRangePickerField = ({
  startId,
  endId,
  startName,
  endName,
  startValue = "",
  endValue = "",
  onChange,
  disablePast = false,
  required = false,
  placeholder = "Seleccionar rango de fechas",
}: ResponsiveDateRangePickerFieldProps) => {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => dateFromValue(startValue) ?? todayInAppTimeZone());
  const range: DateRange = {
    from: dateFromValue(startValue),
    to: dateFromValue(endValue),
  };
  const disabledDays = (day: Date) => {
    if (disablePast && day < todayInAppTimeZone()) return true;
    return Boolean(range.from && !range.to && day < range.from);
  };

  const updateRange = (nextRange: DateRange | undefined) => {
    const from = dateToValue(nextRange?.from);
    const to = dateToValue(nextRange?.to);

    if (nextRange?.from) setVisibleMonth(nextRange.from);
    onChange?.({ from, to });
  };

  return (
    <div className="w-full">
      <input id={`${startId}-value`} name={startName} type="hidden" value={startValue} readOnly />
      <input id={`${endId}-value`} name={endName} type="hidden" value={endValue} readOnly />

      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" className="h-12 w-full justify-start px-4 text-left font-medium" variant="outline" aria-label={placeholder} aria-required={required}>
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
            {range.from ? (
              range.to ? `${displayDate(range.from)} - ${displayDate(range.to)}` : displayDate(range.from)
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
          <Calendar
            mode="range"
            defaultMonth={visibleMonth}
            month={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelect={updateRange}
            selected={range}
            disabled={disabledDays}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
