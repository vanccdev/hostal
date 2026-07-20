import type { SupabaseClient } from "@supabase/supabase-js";
import { localISODate } from "@/lib/datetime";
import { intervalsOverlap } from "@/lib/room-availability";
import { getStaySettings, scheduledStayInterval, type StaySettings } from "@/lib/stay-settings";
import { selectTarifaActualParaHabitacion } from "@/lib/tarifas";
import type { Database } from "@/types/database";

export const differenceInNights = (fechaIngreso: string, fechaSalida: string) => {
  const ingreso = new Date(`${fechaIngreso}T00:00:00`);
  const salida = new Date(`${fechaSalida}T00:00:00`);
  const diff = salida.getTime() - ingreso.getTime();

  return Math.round(diff / 86_400_000);
};

export const assertReservationDates = (fechaIngreso: string, fechaSalida: string) => {
  if (fechaIngreso < localISODate()) {
    throw new Error("La fecha de ingreso no puede ser anterior a hoy.");
  }

  const nights = differenceInNights(fechaIngreso, fechaSalida);

  if (nights <= 0) {
    throw new Error("La fecha de salida debe ser mayor que la fecha de ingreso.");
  }

  return nights;
};

export const assertRoomIsAvailable = async (
  supabase: SupabaseClient<Database>,
  habitacionId: string,
  fechaIngreso: string,
  fechaSalida: string,
  settings?: StaySettings,
) => {
  const staySettings = settings ?? await getStaySettings(supabase);
  const targetInterval = scheduledStayInterval(fechaIngreso, fechaSalida, staySettings);
  const { data: overlappingReservations, error: reservationsError } = await supabase
    .from("reservas")
    .select("id,fecha_ingreso,fecha_salida,checkin_programado_at,checkout_programado_at")
    .eq("habitacion_id", habitacionId)
    .in("estado", ["pendiente_pago", "confirmada", "checkin"])
    .lt("fecha_ingreso", fechaSalida)
    .gt("fecha_salida", fechaIngreso)
    .limit(1);

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  const hasOverlappingReservation = overlappingReservations.some((reservation) => {
    const reservationInterval = {
      checkinAt: reservation.checkin_programado_at ?? scheduledStayInterval(
        reservation.fecha_ingreso,
        reservation.fecha_salida,
        staySettings,
      ).checkinAt,
      checkoutAt: reservation.checkout_programado_at ?? scheduledStayInterval(
        reservation.fecha_ingreso,
        reservation.fecha_salida,
        staySettings,
      ).checkoutAt,
    };

    return intervalsOverlap(
      reservationInterval.checkinAt,
      reservationInterval.checkoutAt,
      targetInterval.checkinAt,
      targetInterval.checkoutAt,
    );
  });

  if (hasOverlappingReservation) {
    throw new Error("La habitación ya tiene una reserva en ese rango de fechas.");
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("bloqueos_fechas")
    .select("id")
    .or(`habitacion_id.eq.${habitacionId},habitacion_id.is.null`)
    .lt("fecha_inicio", fechaSalida)
    .gt("fecha_fin", fechaIngreso)
    .limit(1);

  if (blocksError && blocksError.code !== "42P01") {
    throw new Error(blocksError.message);
  }

  if (blocks && blocks.length > 0) {
    throw new Error("La habitación está bloqueada en ese rango de fechas.");
  }
};

export const calculateReservationPrice = async (
  supabase: SupabaseClient<Database>,
  tarifaId: string,
  habitacionId: string,
  nights: number,
) => {
  const [{ data: habitacion, error: habitacionError }, { data: tarifa, error: tarifaError }] =
    await Promise.all([
      supabase.from("habitaciones").select("tipo,activa").eq("id", habitacionId).maybeSingle(),
      supabase
        .from("tarifas")
        .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
        .eq("id", tarifaId)
        .maybeSingle(),
    ]);

  if (habitacionError) {
    throw new Error(habitacionError.message);
  }

  if (tarifaError) {
    throw new Error(tarifaError.message);
  }

  if (!habitacion) {
    throw new Error("Selecciona una habitación válida.");
  }

  if (habitacion.activa === false) {
    throw new Error("La habitación seleccionada no está activa.");
  }

  if (!tarifa) {
    throw new Error("Selecciona una tarifa válida.");
  }

  if (tarifa.activa === false) {
    throw new Error("La tarifa seleccionada no está activa.");
  }

  if (tarifa.habitacion_tipo !== habitacion.tipo) {
    throw new Error("La tarifa seleccionada no corresponde a la habitación.");
  }

  const { data: tarifasVigentes, error: tarifasVigentesError } = await supabase
    .from("tarifas")
    .select("id,habitacion_tipo,temporada,precio_noche,peso,moneda,vigente_desde,vigente_hasta,activa,created_by,created_at")
    .eq("habitacion_tipo", habitacion.tipo)
    .eq("activa", true);

  if (tarifasVigentesError) {
    throw new Error(tarifasVigentesError.message);
  }

  const currentTarifa = selectTarifaActualParaHabitacion(habitacion, tarifasVigentes ?? []);

  if (!currentTarifa || currentTarifa.id !== tarifaId) {
    throw new Error("La tarifa seleccionada no es la tarifa vigente para hoy.");
  }

  return Number(tarifa.precio_noche) * nights;
};
