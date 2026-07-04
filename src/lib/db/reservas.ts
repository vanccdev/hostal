import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const differenceInNights = (fechaIngreso: string, fechaSalida: string) => {
  const ingreso = new Date(`${fechaIngreso}T00:00:00`);
  const salida = new Date(`${fechaSalida}T00:00:00`);
  const diff = salida.getTime() - ingreso.getTime();

  return Math.round(diff / 86_400_000);
};

export const assertReservationDates = (fechaIngreso: string, fechaSalida: string) => {
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
) => {
  const { data: overlappingReservations, error: reservationsError } = await supabase
    .from("reservas")
    .select("id")
    .eq("habitacion_id", habitacionId)
    .in("estado", ["pendiente_pago", "confirmada", "checkin"])
    .lt("fecha_ingreso", fechaSalida)
    .gt("fecha_salida", fechaIngreso)
    .limit(1);

  if (reservationsError) {
    throw new Error(reservationsError.message);
  }

  if (overlappingReservations.length > 0) {
    throw new Error("La habitación ya tiene una reserva en ese rango de fechas.");
  }

  const { data: blocks, error: blocksError } = await supabase
    .from("bloqueos_fechas")
    .select("id")
    .eq("habitacion_id", habitacionId)
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
  nights: number,
) => {
  const { data: tarifa, error } = await supabase
    .from("tarifas")
    .select("precio_noche")
    .eq("id", tarifaId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!tarifa) {
    throw new Error("Selecciona una tarifa válida.");
  }

  return Number(tarifa.precio_noche) * nights;
};
