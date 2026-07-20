import { APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import { scheduledStayInterval, scheduledStayTimestamp, type StaySettings } from "@/lib/stay-settings";

type RoomReservationLike = {
  habitacion_id: string;
  fecha_ingreso: string;
  fecha_salida: string;
  checkin_programado_at?: string | null;
  checkout_programado_at?: string | null;
};

type RoomBlockLike = {
  habitacion_id?: unknown;
  fecha_inicio?: unknown;
  fecha_fin?: unknown;
};

type RoomAvailabilityInput = {
  roomId: string;
  fechaIngreso: string;
  fechaSalida: string;
  reservas: RoomReservationLike[];
  bloqueos: RoomBlockLike[];
  staySettings: StaySettings;
  now?: Date;
};

export type RoomAvailabilityStatus = {
  available: boolean;
  label: string;
  detail?: string;
  variant: "default" | "secondary" | "destructive";
  nextAvailableAt?: string;
};

const stringValue = (value: unknown) => (typeof value === "string" ? value : "");

export const intervalsOverlap = (start: string, end: string, targetStart: string, targetEnd: string) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  const targetStartTime = new Date(targetStart).getTime();
  const targetEndTime = new Date(targetEnd).getTime();

  return startTime < targetEndTime && endTime > targetStartTime;
};

const overlaps = (start: string, end: string, targetStart: string, targetEnd: string) =>
  start < targetEnd && end > targetStart;

const reservationInterval = (reserva: RoomReservationLike, staySettings: StaySettings) => {
  const fallbackInterval = scheduledStayInterval(reserva.fecha_ingreso, reserva.fecha_salida, staySettings);

  return {
    checkinAt: reserva.checkin_programado_at ?? fallbackInterval.checkinAt,
    checkoutAt: reserva.checkout_programado_at ?? fallbackInterval.checkoutAt,
  };
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("es-BO", {
    timeZone: APP_TIME_ZONE,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const countdownText = (targetAt: string, now: Date) => {
  const diffMinutes = Math.ceil((new Date(targetAt).getTime() - now.getTime()) / 60_000);

  if (diffMinutes <= 0) {
    return undefined;
  }

  if (diffMinutes < 60) {
    return `en ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  return minutes > 0 ? `en ${hours} h ${minutes} min` : `en ${hours} h`;
};

const addDays = (date: string, days: number) => {
  const nextDate = new Date(`${date}T12:00:00-04:00`);
  nextDate.setDate(nextDate.getDate() + days);

  return localISODate(nextDate);
};

const nextCheckinAfterCheckout = (checkoutAt: string, staySettings: StaySettings) => {
  const checkoutDate = localISODate(new Date(checkoutAt));
  const sameDayCheckinAt = scheduledStayTimestamp(checkoutDate, staySettings.checkinTime);

  if (new Date(checkoutAt).getTime() <= new Date(sameDayCheckinAt).getTime()) {
    return sameDayCheckinAt;
  }

  return scheduledStayTimestamp(addDays(checkoutDate, 1), staySettings.checkinTime);
};

export const getRoomAvailabilityStatus = ({
  roomId,
  fechaIngreso,
  fechaSalida,
  reservas,
  bloqueos,
  staySettings,
  now = new Date(),
}: RoomAvailabilityInput): RoomAvailabilityStatus => {
  const hasDateRange = Boolean(fechaIngreso && fechaSalida);

  if (hasDateRange) {
    const targetInterval = scheduledStayInterval(fechaIngreso, fechaSalida, staySettings);
    const overlappingReservation = reservas
      .filter((reserva) => reserva.habitacion_id === roomId)
      .map((reserva) => reservationInterval(reserva, staySettings))
      .find((interval) =>
        intervalsOverlap(interval.checkinAt, interval.checkoutAt, targetInterval.checkinAt, targetInterval.checkoutAt),
      );

    if (overlappingReservation) {
      return {
        available: false,
        label: `Ocupada hasta ${formatDateTime(overlappingReservation.checkoutAt)}`,
        variant: "destructive",
        nextAvailableAt: overlappingReservation.checkoutAt,
      };
    }

    const blocked = bloqueos.some((bloqueo) => {
      const isGlobalBlock = bloqueo.habitacion_id === null;
      const blockRoomId = stringValue(bloqueo.habitacion_id);
      const fechaInicio = stringValue(bloqueo.fecha_inicio);
      const fechaFin = stringValue(bloqueo.fecha_fin);

      return (
        (blockRoomId === roomId || isGlobalBlock) &&
        Boolean(fechaInicio && fechaFin) &&
        overlaps(fechaInicio, fechaFin, fechaIngreso, fechaSalida)
      );
    });

    if (blocked) {
      return {
        available: false,
        label: "Bloqueada",
        variant: "destructive",
      };
    }

    const countdown = localISODate(now) === fechaIngreso ? countdownText(targetInterval.checkinAt, now) : undefined;

    return {
      available: true,
      label: countdown
        ? `Disponible desde ${formatTime(targetInterval.checkinAt)}`
        : "Disponible",
      detail: countdown,
      variant: countdown ? "secondary" : "default",
      nextAvailableAt: countdown ? targetInterval.checkinAt : undefined,
    };
  }

  const nowTime = now.getTime();
  const currentReservation = reservas
    .filter((reserva) => reserva.habitacion_id === roomId)
    .map((reserva) => reservationInterval(reserva, staySettings))
    .filter((interval) => {
      const checkinTime = new Date(interval.checkinAt).getTime();
      const checkoutTime = new Date(interval.checkoutAt).getTime();

      return checkinTime <= nowTime && checkoutTime > nowTime;
    })
    .sort((a, b) => new Date(a.checkoutAt).getTime() - new Date(b.checkoutAt).getTime())[0];

  if (currentReservation) {
    const nextCheckinAt = nextCheckinAfterCheckout(currentReservation.checkoutAt, staySettings);
    const countdown = countdownText(nextCheckinAt, now) ?? countdownText(currentReservation.checkoutAt, now);

    return {
      available: false,
      label: `Ocupada hasta ${formatTime(currentReservation.checkoutAt)}`,
      detail: countdown ? `Disponible desde ${formatTime(nextCheckinAt)} (${countdown})` : undefined,
      variant: "destructive",
      nextAvailableAt: nextCheckinAt,
    };
  }

  const today = localISODate(now);
  const blockedToday = bloqueos.some((bloqueo) => {
    const isGlobalBlock = bloqueo.habitacion_id === null;
    const blockRoomId = stringValue(bloqueo.habitacion_id);
    const fechaInicio = stringValue(bloqueo.fecha_inicio);
    const fechaFin = stringValue(bloqueo.fecha_fin);

    return (blockRoomId === roomId || isGlobalBlock) && Boolean(fechaInicio && fechaFin) && fechaInicio <= today && fechaFin > today;
  });

  if (blockedToday) {
    return {
      available: false,
      label: "Bloqueada",
      variant: "destructive",
    };
  }

  const todayCheckinAt = scheduledStayTimestamp(localISODate(now), staySettings.checkinTime);
  const countdown = countdownText(todayCheckinAt, now);

  if (countdown) {
    return {
      available: true,
      label: `Disponible desde ${formatTime(todayCheckinAt)}`,
      detail: countdown,
      variant: "secondary",
      nextAvailableAt: todayCheckinAt,
    };
  }

  return {
    available: true,
    label: "Disponible",
    variant: "default",
  };
};
