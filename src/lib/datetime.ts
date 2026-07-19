export const APP_TIME_ZONE = "America/La_Paz";
export const APP_LOCALE = "es-BO";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
const timezonePattern = /(?:Z|[+-]\d{2}:?\d{2})$/;

const dateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
};

export const localISODate = (date = new Date()) => {
  const parts = dateParts(date);

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const localISODateTime = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}:${value("second")}`;
};

export const parseAppTimestamp = (value: string) => {
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;

  if (dateOnlyPattern.test(normalized)) {
    return new Date(`${normalized}T00:00:00-04:00`);
  }

  if (timezonePattern.test(normalized)) {
    return new Date(normalized);
  }

  return new Date(`${normalized}-04:00`);
};

export const appTimestampToMs = (value: string) => parseAppTimestamp(value).getTime();

export const formatDate = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = parseAppTimestamp(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "-";
  }

  const date = parseAppTimestamp(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
};
