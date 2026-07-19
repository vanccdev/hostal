import type { SupabaseClient } from "@supabase/supabase-js";
import { APP_TIME_ZONE } from "@/lib/datetime";
import type { Database } from "@/types/database";

export const staySettingKeys = {
  checkinTime: "reserva_checkin_hora",
  checkoutTime: "reserva_checkout_hora",
  turnoverMinutes: "reserva_turnover_minutos",
  timezone: "reserva_timezone",
  paymentProofTimeoutMinutes: "reserva_comprobante_espera_minutos",
  cancellationRefundHours: "cancelacion_reembolso_horas",
  cancellationRetentionPercent: "cancelacion_retencion_porcentaje",
} as const;

export type StaySettings = {
  checkinTime: string;
  checkoutTime: string;
  turnoverMinutes: number;
  timezone: string;
  paymentProofTimeoutMinutes: number;
  cancellationRefundHours: number;
  cancellationRetentionPercent: number;
};

export const defaultStaySettings: StaySettings = {
  checkinTime: "14:00",
  checkoutTime: "12:00",
  turnoverMinutes: 120,
  timezone: APP_TIME_ZONE,
  paymentProofTimeoutMinutes: 120,
  cancellationRefundHours: 12,
  cancellationRetentionPercent: 20,
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

const validTimeoutMinutes = (value: string | undefined, fallback: number) => {
  const minutes = Number(value);

  return Number.isInteger(minutes) && minutes >= 0 && minutes <= 10_080 ? minutes : fallback;
};

const validHours = (value: string | undefined, fallback: number) => {
  const hours = Number(value);

  return Number.isInteger(hours) && hours >= 0 && hours <= 8_760 ? hours : fallback;
};

const validPercent = (value: string | undefined, fallback: number) => {
  const percent = Number(value);

  return Number.isInteger(percent) && percent >= 0 && percent <= 100 ? percent : fallback;
};

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
    paymentProofTimeoutMinutes: validTimeoutMinutes(
      values.get(staySettingKeys.paymentProofTimeoutMinutes),
      defaultStaySettings.paymentProofTimeoutMinutes,
    ),
    cancellationRefundHours: validHours(
      values.get(staySettingKeys.cancellationRefundHours),
      defaultStaySettings.cancellationRefundHours,
    ),
    cancellationRetentionPercent: validPercent(
      values.get(staySettingKeys.cancellationRetentionPercent),
      defaultStaySettings.cancellationRetentionPercent,
    ),
  };
};

export const scheduledStayTimestamp = (date: string, time: string) => `${date}T${time}:00-04:00`;

export const scheduledStayInterval = (fechaIngreso: string, fechaSalida: string, settings: StaySettings) => ({
  checkinAt: scheduledStayTimestamp(fechaIngreso, settings.checkinTime),
  checkoutAt: scheduledStayTimestamp(fechaSalida, settings.checkoutTime),
});

export const stayPolicyText = (settings: StaySettings) =>
  `Check-in desde las ${settings.checkinTime}. Check-out hasta las ${settings.checkoutTime}.`;

export const cancellationPolicyText = (settings: StaySettings) => {
  if (settings.cancellationRefundHours <= 0) {
    return `Cancelación antes del check-in programado: reembolso total. Después de iniciado el hospedaje se retiene el ${settings.cancellationRetentionPercent}% del monto pagado.`;
  }

  return `Cancelación hasta ${settings.cancellationRefundHours} horas antes del check-in programado: reembolso total. Después de ese límite el sistema registra como monto final del hostal el ${settings.cancellationRetentionPercent}% del monto pagado.`;
};
