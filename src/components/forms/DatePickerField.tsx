"use client";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerFieldProps = {
  id: string;
  name: string;
  defaultValue?: string;
  disablePast?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
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
}: DatePickerFieldProps) => {
  const [date, setDate] = useState<Date | undefined>(() => dateFromValue(defaultValue));
  const selectedDate = value === undefined ? date : dateFromValue(value);
  const fieldValue = valueFromDate(selectedDate);

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
        <PopoverContent align="start" collisionPadding={16} className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden">
          <Calendar
            mode="single"
            selected={selectedDate}
            disabled={disablePast ? { before: startOfToday() } : undefined}
            onSelect={(nextDate) => {
              setDate(nextDate);
              onChange?.(valueFromDate(nextDate));
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
};
