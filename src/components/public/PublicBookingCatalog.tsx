"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BedDouble, CalendarDays, ImageIcon, LogIn, Users } from "lucide-react";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import { pendingReservationStorageKey } from "@/lib/reservation-intent";
import { cn } from "@/lib/utils";
import type { Habitacion, ImgHabitacion, Reserva, Tarifa } from "@/types/database";

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
  const tarifaByRoom = useMemo(() => {
    const byRoom = new Map<string, Tarifa>();

    for (const habitacion of habitaciones) {
      const assignedTarifa = tarifas.find((tarifa) => tarifa.activa !== false && tarifa.id === habitacion.tarifa_id);
      const legacyTarifa = tarifas.find(
        (tarifa) => tarifa.activa !== false && tarifa.habitacion_tipo === habitacion.tipo,
      );
      const tarifa = assignedTarifa ?? legacyTarifa;

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
  const selectedTarifa = selectedRoom ? tarifaByRoom.get(selectedRoom.id) ?? null : null;
  const unavailable = selectedRoom ? isRoomUnavailable(selectedRoom.id, fechaIngreso, fechaSalida) : false;
  const selectedRoomInactive = selectedRoom?.activa === false;
  const canContinue = Boolean(selectedRoom && selectedTarifa && nights > 0 && !unavailable && !selectedRoomInactive);

  const continueReservation = () => {
    if (!canContinue) {
      return;
    }

    window.sessionStorage.setItem(
      pendingReservationStorageKey,
      JSON.stringify({
        habitacionId,
        fechaIngreso,
        fechaSalida,
      }),
    );
    router.push(continueHref);
  };

  return (
    <section id="habitaciones" className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-[#dddddd] bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
        <div className="grid gap-4 md:grid-cols-[minmax(0,34rem)_auto] md:items-end md:justify-between">
          <div className="space-y-2">
            <Label>Fechas</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="publicFechaIngreso" className="text-xs text-[#717171] dark:text-[#b0b0b0]">
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
                <Label htmlFor="publicFechaSalida" className="text-xs text-[#717171] dark:text-[#b0b0b0]">
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
          <Button type="button" className="h-12" disabled={!canContinue} onClick={continueReservation}>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Reservar
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold text-[#222222] dark:text-zinc-100">Habitaciones</h2>
          <p className="text-sm text-[#717171] dark:text-[#b0b0b0]">
            Revisa fotos, tarifas y disponibilidad antes de iniciar sesión.
          </p>
        </div>
        {nights > 0 ? <Badge variant="secondary">{nights} noches seleccionadas</Badge> : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {habitaciones.map((habitacion, index) => {
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
              onClick={() => setHabitacionId(habitacion.id)}
              className={cn(
                "group overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff385c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1f1f1f]",
                selected ? "border-[#ff385c] ring-2 ring-[#ff385c]" : "border-[#dddddd] dark:border-[#3a3a3a]",
              )}
            >
              <div className="relative aspect-[4/3] bg-[#f7f7f7] dark:bg-[#242424]">
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
                  <div className="flex h-full items-center justify-center text-[#717171] dark:text-[#b0b0b0]">
                    <ImageIcon className="h-8 w-8" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute left-3 top-3 flex gap-2">
                  <Badge variant={roomUnavailable || inactive ? "destructive" : "default"}>
                    {inactive ? "Inactiva" : roomUnavailable ? "Ocupada" : "Disponible"}
                  </Badge>
                  {roomImages.length > 1 ? <Badge variant="outline">{roomImages.length} fotos</Badge> : null}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#222222] dark:text-zinc-100">Habitación {habitacion.numero}</h3>
                    <p className="text-sm text-[#717171] dark:text-[#b0b0b0]">{habitacion.tipo}</p>
                  </div>
                  {tarifa ? (
                    <div className="text-right">
                      <p className="font-semibold text-[#222222] dark:text-zinc-100">
                        {tarifa.precio_noche} {tarifa.moneda}
                      </p>
                      <p className="text-xs text-[#717171] dark:text-[#b0b0b0]">noche</p>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-[#717171] dark:text-[#b0b0b0]">
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
                  <p className="line-clamp-2 min-h-10 text-sm text-[#717171] dark:text-[#b0b0b0]">{habitacion.descripcion}</p>
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

      <div className="sticky bottom-4 z-20 rounded-2xl border border-[#dddddd] bg-white p-4 shadow-[0_12px_34px_rgba(0,0,0,0.14)] dark:border-[#3a3a3a] dark:bg-[#1f1f1f]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm">
            <p className="font-semibold text-[#222222] dark:text-zinc-100">
              {selectedRoom ? `Habitación ${selectedRoom.numero} · ${selectedRoom.tipo}` : "Selecciona una habitación"}
            </p>
            <p className="text-[#717171] dark:text-[#b0b0b0]">
              {selectedTarifa && nights > 0
                ? `${Number(selectedTarifa.precio_noche) * nights} ${selectedTarifa.moneda} total · ${nights} noches`
                : "El inicio de sesión se pedirá recién al confirmar."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/login">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Iniciar sesión
              </Link>
            </Button>
            <Button type="button" disabled={!canContinue} onClick={continueReservation}>
              Reservar ahora
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
