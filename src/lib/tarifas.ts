import type { Habitacion, Tarifa } from "@/types/database";

type TarifaLike = Pick<
  Tarifa,
  "id" | "habitacion_tipo" | "activa"
>;

type HabitacionLike = Pick<Habitacion, "id" | "tipo" | "tarifa_id">;

export const selectTarifaAsignadaParaHabitacion = <T extends TarifaLike>(
  habitacion: HabitacionLike,
  tarifas: T[],
) =>
  tarifas
    .find(
      (tarifa) =>
        tarifa.id === habitacion.tarifa_id &&
        tarifa.habitacion_tipo === habitacion.tipo &&
        tarifa.activa !== false,
    ) ?? null;
