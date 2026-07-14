"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BedDouble, ImageIcon, Users } from "lucide-react";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import { pendingReservationStorageKey } from "@/lib/reservation-intent";
import { selectTarifaActualParaHabitacion } from "@/lib/tarifas";
import { cn } from "@/lib/utils";
import type { Habitacion, HabitacionTipo, ImgHabitacion, Reserva, Tarifa } from "@/types/database";

type RoomImage = Pick<ImgHabitacion, "id" | "habitacion_id" | "url">;
type RoomBlock = {
  id: string;
  habitacion_id?: unknown;
  fecha_inicio?: unknown;
  fecha_fin?: unknown;
};

type PublicBookingCatalogProps = {
  habitaciones: Habitacion[];
  tarifas: Tarifa[];
  imagenes: RoomImage[];
  reservas: Pick<Reserva, "id" | "habitacion_id" | "fecha_ingreso" | "fecha_salida" | "estado">[];
  bloqueos: RoomBlock[];
  continueHref: string;
};

const addDays = (date: string, days: number) => {
  const nextDate = new Date(`${date}T12:00:00-04:00`);
  nextDate.setDate(nextDate.getDate() + days);

  return localISODate(nextDate);
};

const nightsBetween = (start: string, end: string) => {
  if (!start || !end) {
    return 0;
  }

  const diff = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();

  return Math.max(0, Math.round(diff / 86_400_000));
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", timeZone: APP_TIME_ZONE }).format(
    new Date(`${date}T12:00:00-04:00`),
  );

const formatWeekday = (date: string) =>
  new Intl.DateTimeFormat("es", { weekday: "short", timeZone: APP_TIME_ZONE }).format(new Date(`${date}T12:00:00-04:00`)).slice(0, 1);

const overlaps = (start: string, end: string, targetStart: string, targetEnd: string) =>
  start < targetEnd && end > targetStart;

const stringValue = (value: unknown) => (typeof value === "string" ? value : "");

const roomTypeOrder: HabitacionTipo[] = ["individual", "matrimonial", "individual doble", "triple", "familiar"];

const roomTypeLabel: Record<HabitacionTipo, string> = {
  individual: "Individual",
  matrimonial: "Matrimonial",
  "individual doble": "Individual doble",
  triple: "Triple",
  familiar: "Familiar",
};

export const PublicBookingCatalog = ({
  habitaciones,
  tarifas,
  imagenes,
  reservas,
  bloqueos,
  continueHref,
}: PublicBookingCatalogProps) => {
  const router = useRouter();
  const [habitacionId, setHabitacionId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const nights = nightsBetween(fechaIngreso, fechaSalida);
  const imagesByRoom = useMemo(() => {
    const grouped = new Map<string, RoomImage[]>();

    for (const image of imagenes) {
      const currentImages = grouped.get(image.habitacion_id) ?? [];
      currentImages.push(image);
      grouped.set(image.habitacion_id, currentImages);
    }

    return grouped;
  }, [imagenes]);
  const roomGroups = useMemo(() => {
    const grouped = new Map<HabitacionTipo, Habitacion[]>();

    for (const type of roomTypeOrder) {
      grouped.set(type, []);
    }

    for (const habitacion of habitaciones) {
      const rooms = grouped.get(habitacion.tipo) ?? [];
      rooms.push(habitacion);
      grouped.set(habitacion.tipo, rooms);
    }

    return roomTypeOrder
      .map((type) => ({
        type,
        habitaciones: grouped.get(type) ?? [],
      }))
      .filter((group) => group.habitaciones.length > 0);
  }, [habitaciones]);
  const groupedRooms = useMemo(() => roomGroups.flatMap((group) => group.habitaciones), [roomGroups]);
  const tarifaByRoom = useMemo(() => {
    const byRoom = new Map<string, Tarifa>();
    const today = localISODate();

    for (const habitacion of habitaciones) {
      const tarifa = selectTarifaActualParaHabitacion(habitacion, tarifas, today);

      if (tarifa) {
        byRoom.set(habitacion.id, tarifa);
      }
    }

    return byRoom;
  }, [habitaciones, tarifas]);
  const isRoomUnavailable = (roomId: string, start: string, end: string) => {
    if (!start || !end) {
      return false;
    }

    return (
      reservas.some((reserva) => reserva.habitacion_id === roomId && overlaps(reserva.fecha_ingreso, reserva.fecha_salida, start, end)) ||
      bloqueos.some((bloqueo) => {
        const blockRoomId = stringValue(bloqueo.habitacion_id);
        const fechaInicio = stringValue(bloqueo.fecha_inicio);
        const fechaFin = stringValue(bloqueo.fecha_fin);

        return blockRoomId === roomId && Boolean(fechaInicio && fechaFin) && overlaps(fechaInicio, fechaFin, start, end);
      })
    );
  };
  const availabilityDays = (roomId: string) => {
    const baseDate = fechaIngreso || localISODate();

    return Array.from({ length: 7 }, (_, index) => {
      const date = addDays(baseDate, index);
      const nextDate = addDays(date, 1);

      return {
        date,
        available: !isRoomUnavailable(roomId, date, nextDate),
      };
    });
  };
  const selectedRoom = habitaciones.find((habitacion) => habitacion.id === habitacionId) ?? null;

  const continueReservation = (nextHabitacionId = habitacionId) => {
    if (!nextHabitacionId) {
      return;
    }

    window.sessionStorage.setItem(
      pendingReservationStorageKey,
      JSON.stringify({
        habitacionId: nextHabitacionId,
        fechaIngreso,
        fechaSalida,
      }),
    );
    router.push(continueHref);
  };

  return (
    <section id="habitaciones" className="mx-auto max-w-7xl scroll-mt-20 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#d8d4c8] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,34rem)_auto] md:items-end md:justify-between">
          <div className="space-y-2">
            <Label>Fechas</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publicFechaIngreso" className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
                  Ingreso
                </Label>
                <DatePickerField
                  id="publicFechaIngreso"
                  name="publicFechaIngreso"
                  value={fechaIngreso}
                  onChange={setFechaIngreso}
                  placeholder="Seleccionar ingreso"
                  disablePast
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicFechaSalida" className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
                  Salida
                </Label>
                <DatePickerField
                  id="publicFechaSalida"
                  name="publicFechaSalida"
                  value={fechaSalida}
                  onChange={setFechaSalida}
                  placeholder="Seleccionar salida"
                  disablePast
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
            Selecciona una habitación para iniciar sesión o crear tu cuenta y continuar la reserva.
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-[#18221b] dark:text-zinc-100">Habitaciones</h2>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
            Revisa fotos, tarifas y disponibilidad antes de iniciar sesión.
          </p>
        </div>
        {nights > 0 ? <Badge variant="secondary">{nights} noches seleccionadas</Badge> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {groupedRooms.map((habitacion, index) => {
          const tarifa = tarifaByRoom.get(habitacion.id) ?? null;
          const roomImages = imagesByRoom.get(habitacion.id) ?? [];
          const image = roomImages[0];
          const selected = habitacion.id === selectedRoom?.id;
          const roomUnavailable = isRoomUnavailable(habitacion.id, fechaIngreso, fechaSalida);
          const inactive = habitacion.activa === false;
          const disabled = !tarifa || roomUnavailable || inactive;

          return (
            <button
              key={habitacion.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => {
                setHabitacionId(habitacion.id);
                continueReservation(habitacion.id);
              }}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a35a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#18251d]",
                selected ? "border-[#c7a35a] ring-2 ring-[#c7a35a]" : "border-[#d8d4c8] dark:border-[#314237]",
              )}
            >
              <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#1d2c23]">
                {image ? (
                  <Image
                    src={image.url}
                    alt={`Habitación ${habitacion.numero}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    priority={index < 2}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#66736a] dark:text-[#b7c0b4]">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#18221b] dark:text-zinc-100">Habitación {habitacion.numero}</h3>
                    <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{roomTypeLabel[habitacion.tipo]}</p>
                  </div>
                  {tarifa ? (
                    <div className="text-right">
                      <p className="font-semibold text-[#18221b] dark:text-zinc-100">
                        {tarifa.precio_noche} {tarifa.moneda}
                      </p>
                      <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">noche</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-[#66736a] dark:text-[#b7c0b4]">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {habitacion.capacidad_max} huéspedes
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5" aria-hidden="true" />
                    Piso {habitacion.piso}
                  </span>
                </div>

                {habitacion.descripcion ? (
                  <p className="line-clamp-2 min-h-10 text-sm text-[#66736a] dark:text-[#b7c0b4]">{habitacion.descripcion}</p>
                ) : null}

                <div className="grid grid-cols-7 gap-1">
                  {availabilityDays(habitacion.id).map((day) => (
                    <div
                      key={day.date}
                      className={cn(
                        "rounded-lg border px-1 py-1.5 text-center text-[0.68rem] leading-tight",
                        day.available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
                          : "border-zinc-200 bg-zinc-100 text-zinc-400 line-through dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500",
                      )}
                      title={`${formatDate(day.date)} ${day.available ? "disponible" : "no disponible"}`}
                    >
                      <span className="block uppercase">{formatWeekday(day.date)}</span>
                      <span className="block font-semibold">{new Date(`${day.date}T00:00:00`).getDate()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

    </section>
  );
};
