import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_TIME_ZONE } from "@/lib/datetime";
import type { Database } from "@/types/database";

export const staySettingKeys = {
  checkinTime: "reserva_checkin_hora",
  checkoutTime: "reserva_checkout_hora",
  turnoverMinutes: "reserva_turnover_minutos",
  timezone: "reserva_timezone",
} as const;

export type StaySettings = {
  checkinTime: string;
  checkoutTime: string;
  turnoverMinutes: number;
  timezone: string;
};

export const defaultStaySettings: StaySettings = {
  checkinTime: "14:00",
  checkoutTime: "12:00",
  turnoverMinutes: 120,
  timezone: APP_TIME_ZONE,
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const validTime = (value: string | undefined, fallback: string) =>
  value && timePattern.test(value) ? value : fallback;

const minutesFromTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

export const calculateTurnoverMinutes = (checkoutTime: string, checkinTime: string) => {
  const checkoutMinutes = minutesFromTime(checkoutTime);
  const checkinMinutes = minutesFromTime(checkinTime);

  return checkinMinutes - checkoutMinutes;
};

export const hasValidStaySchedule = (checkoutTime: string, checkinTime: string) =>
  calculateTurnoverMinutes(checkoutTime, checkinTime) >= 1;

export const getStaySettings = async (supabase: SupabaseClient<Database>): Promise<StaySettings> => {
  const { data, error } = await supabase
    .from("configuracion_hostal")
    .select("clave,valor")
    .in("clave", Object.values(staySettingKeys));

  if (error) {
    return defaultStaySettings;
  }

  const values = new Map((data ?? []).map((row) => [row.clave, row.valor]));

  const checkinTime = validTime(values.get(staySettingKeys.checkinTime), defaultStaySettings.checkinTime);
  const checkoutTime = validTime(values.get(staySettingKeys.checkoutTime), defaultStaySettings.checkoutTime);
  const hasValidSchedule = hasValidStaySchedule(checkoutTime, checkinTime);

  return {
    checkinTime: hasValidSchedule ? checkinTime : defaultStaySettings.checkinTime,
    checkoutTime: hasValidSchedule ? checkoutTime : defaultStaySettings.checkoutTime,
    turnoverMinutes: hasValidSchedule
      ? calculateTurnoverMinutes(checkoutTime, checkinTime)
      : defaultStaySettings.turnoverMinutes,
    timezone: APP_TIME_ZONE,
  };
};

export const scheduledStayTimestamp = (date: string, time: string) => `${date}T${time}:00-04:00`;

export const scheduledStayInterval = (fechaIngreso: string, fechaSalida: string, settings: StaySettings) => ({
  checkinAt: scheduledStayTimestamp(fechaIngreso, settings.checkinTime),
  checkoutAt: scheduledStayTimestamp(fechaSalida, settings.checkoutTime),
});

export const stayPolicyText = (settings: StaySettings) =>
  `Check-in desde las ${settings.checkinTime}. Check-out hasta las ${settings.checkoutTime}.`;
