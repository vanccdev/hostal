"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DatePickerFieldProps = {
  id: string;
  name: string;
  defaultValue?: string;
  disablePast?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  showMonthYearSelect?: boolean;
  fromYear?: number;
  toYear?: number;
};

const dateFromValue = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const valueFromDate = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");
const labelFromDate = (date?: Date) => (date ? format(date, "dd/MM/yyyy") : null);
const monthLabels = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("es", { month: "long" }).format(new Date(2000, month, 1)),
);
const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
};

export const DatePickerField = ({
  id,
  name,
  defaultValue,
  disablePast = false,
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  required,
  showMonthYearSelect = false,
  fromYear = new Date().getFullYear() - 120,
  toYear = new Date().getFullYear(),
}: DatePickerFieldProps) => {
  const [date, setDate] = useState<Date | undefined>(() => dateFromValue(defaultValue));
  const selectedDate = value === undefined ? date : dateFromValue(value);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => selectedDate ?? new Date(Math.min(toYear, new Date().getFullYear() - 18), 0, 1));
  const fieldValue = valueFromDate(selectedDate);
  const years = Array.from({ length: toYear - fromYear + 1 }, (_, index) => toYear - index);

  const updateVisibleMonth = (nextMonth: number, nextYear: number) => {
    setVisibleMonth(new Date(nextYear, nextMonth, 1));
  };

  return (
    <>
      <input id={id} name={name} type="hidden" value={fieldValue} required={required} readOnly />
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-12 w-full justify-start px-4 text-left font-medium">
            <CalendarIcon className="h-4 w-4 text-[#c7a35a]" aria-hidden="true" />
            {labelFromDate(selectedDate) ?? <span className="text-[#66736a] dark:text-[#b7c0b4]">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden">
          {showMonthYearSelect ? (
            <div className="grid gap-2 p-1 pb-3 sm:grid-cols-2">
              <Select
                value={String(visibleMonth.getMonth())}
                onValueChange={(nextMonth) => updateVisibleMonth(Number(nextMonth), visibleMonth.getFullYear())}
              >
                <SelectTrigger aria-label="Mes">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthLabels.map((label, month) => (
                    <SelectItem key={label} value={String(month)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(visibleMonth.getFullYear())}
                onValueChange={(nextYear) => updateVisibleMonth(visibleMonth.getMonth(), Number(nextYear))}
              >
                <SelectTrigger aria-label="Año">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <Calendar
            mode="single"
            selected={selectedDate}
            month={showMonthYearSelect ? visibleMonth : undefined}
            onMonthChange={showMonthYearSelect ? setVisibleMonth : undefined}
            disabled={disablePast ? { before: startOfToday() } : undefined}
            onSelect={(nextDate) => {
              setDate(nextDate);
              if (nextDate) {
                setVisibleMonth(nextDate);
              }
              onChange?.(valueFromDate(nextDate));
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
};
