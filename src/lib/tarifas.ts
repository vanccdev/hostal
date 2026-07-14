import { localISODate } from "@/lib/datetime";
import type { Habitacion, Tarifa } from "@/types/database";

type TarifaLike = Pick<
  Tarifa,
  "id" | "habitacion_tipo" | "vigente_desde" | "vigente_hasta" | "activa" | "peso" | "created_at"
>;

type HabitacionLike = Pick<Habitacion, "tipo">;

export const isTarifaVigente = (tarifa: TarifaLike, date = localISODate()) =>
  tarifa.activa !== false &&
  tarifa.vigente_desde <= date &&
  (!tarifa.vigente_hasta || tarifa.vigente_hasta >= date);

const compareTarifasByPriority = (a: TarifaLike, b: TarifaLike) => {
  const pesoDiff = (b.peso ?? 0) - (a.peso ?? 0);

  if (pesoDiff !== 0) {
    return pesoDiff;
  }

  const vigenteDiff = b.vigente_desde.localeCompare(a.vigente_desde);

  if (vigenteDiff !== 0) {
    return vigenteDiff;
  }

  return b.created_at.localeCompare(a.created_at);
};

export const selectTarifaActualParaHabitacion = <T extends TarifaLike>(
  habitacion: HabitacionLike,
  tarifas: T[],
  date = localISODate(),
) =>
  tarifas
    .filter((tarifa) => tarifa.habitacion_tipo === habitacion.tipo && isTarifaVigente(tarifa, date))
    .toSorted(compareTarifasByPriority)[0] ?? null;
