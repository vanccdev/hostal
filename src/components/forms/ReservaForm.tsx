"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { BedDouble, CalendarCheck, CalendarPlus, CheckCircle2, ImageIcon, Users, XCircle } from "lucide-react";
import { createClientReservation, createStaffReservation } from "@/app/actions/reservas";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { FormMessage } from "@/components/forms/FormMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import { pendingReservationStorageKey } from "@/lib/reservation-intent";
import { getRoomAvailabilityStatus, intervalsOverlap } from "@/lib/room-availability";
import { cancellationPolicyText, defaultStaySettings, scheduledStayInterval, stayPolicyText, type StaySettings } from "@/lib/stay-settings";
import { selectTarifaActualParaHabitacion } from "@/lib/tarifas";
import { cn } from "@/lib/utils";
import type { Habitacion, HabitacionTipo, Huesped, ImgHabitacion, Reserva, Tarifa } from "@/types/database";

type RoomImage = Pick<ImgHabitacion, "id" | "habitacion_id" | "url">;
type RoomBlock = {
  id: string;
  habitacion_id?: unknown;
  fecha_inicio?: unknown;
  fecha_fin?: unknown;
};
type RoomReservation = Pick<
  Reserva,
  "id" | "habitacion_id" | "fecha_ingreso" | "fecha_salida" | "estado" | "checkin_programado_at" | "checkout_programado_at"
>;

type ReservaFormProps = {
  mode: "cliente" | "staff";
  habitaciones: Habitacion[];
  tarifas: Tarifa[];
  huespedes?: Huesped[];
  huespedContacts?: Record<string, { nombre: string; email: string | null }>;
  imagenes?: RoomImage[];
  reservas?: RoomReservation[];
  bloqueos?: RoomBlock[];
  staySettings?: StaySettings;
  scrollTargetId?: string;
};

const addDays = (date: string, days: number) => {
  const nextDate = new Date(`${date}T12:00:00-04:00`);
  nextDate.setDate(nextDate.getDate() + days);

  return localISODate(nextDate);
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", timeZone: APP_TIME_ZONE }).format(
    new Date(`${date}T12:00:00-04:00`),
  );

const formatWeekday = (date: string) =>
  new Intl.DateTimeFormat("es", { weekday: "short", timeZone: APP_TIME_ZONE }).format(new Date(`${date}T12:00:00-04:00`)).slice(0, 1);

const nightsBetween = (start: string, end: string) => {
  if (!start || !end) {
    return 0;
  }

  const diff = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();

  return Math.max(0, Math.round(diff / 86_400_000));
};

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

const isPendingReservation = (value: unknown): value is {
  habitacionId: string;
  fechaIngreso: string;
  fechaSalida: string;
} => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.habitacionId === "string" &&
    typeof payload.fechaIngreso === "string" &&
    typeof payload.fechaSalida === "string"
  );
};

export const ReservaForm = ({
  mode,
  habitaciones,
  tarifas,
  huespedes = [],
  huespedContacts = {},
  imagenes = [],
  reservas = [],
  bloqueos = [],
  staySettings = defaultStaySettings,
  scrollTargetId,
}: ReservaFormProps) => {
  const action = mode === "cliente" ? createClientReservation : createStaffReservation;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [habitacionId, setHabitacionId] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [now, setNow] = useState(() => new Date());
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const roomsSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToSelectedRoom = useRef(false);
  const nights = nightsBetween(fechaIngreso, fechaSalida);
  const selectedRoom = useMemo(
    () => habitaciones.find((habitacion) => habitacion.id === habitacionId) ?? null,
    [habitacionId, habitaciones],
  );
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

    const targetInterval = scheduledStayInterval(start, end, staySettings);

    return (
      reservas.some((reserva) => {
        if (reserva.habitacion_id !== roomId) {
          return false;
        }

        const fallbackInterval = scheduledStayInterval(reserva.fecha_ingreso, reserva.fecha_salida, staySettings);
        const checkinAt = reserva.checkin_programado_at ?? fallbackInterval.checkinAt;
        const checkoutAt = reserva.checkout_programado_at ?? fallbackInterval.checkoutAt;

        return intervalsOverlap(checkinAt, checkoutAt, targetInterval.checkinAt, targetInterval.checkoutAt);
      }) ||
      bloqueos.some((bloqueo) => {
        const habitacionId = stringValue(bloqueo.habitacion_id);
        const fechaInicio = stringValue(bloqueo.fecha_inicio);
        const fechaFin = stringValue(bloqueo.fecha_fin);

        return habitacionId === roomId && Boolean(fechaInicio && fechaFin) && overlaps(fechaInicio, fechaFin, start, end);
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
  const selectedTarifa = selectedRoom ? tarifaByRoom.get(selectedRoom.id) ?? null : null;
  const selectedRoomUnavailable = selectedRoom ? isRoomUnavailable(selectedRoom.id, fechaIngreso, fechaSalida) : false;
  const selectedRoomInactive = selectedRoom?.activa === false;
  const hasSelectedDateRange = nights > 0;
  const canSubmit = Boolean(selectedRoom && selectedTarifa && nights > 0 && !selectedRoomUnavailable && !selectedRoomInactive);
  const visibleRoomGroups = useMemo(
    () =>
      roomGroups
        .map((group) => ({
          ...group,
          habitaciones: selectedRoom
            ? group.habitaciones.filter((habitacion) => habitacion.id !== selectedRoom.id)
            : group.habitaciones,
        }))
        .filter((group) => group.habitaciones.length > 0),
    [roomGroups, selectedRoom],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let timeoutId: number | undefined;
    const rawReservation = window.sessionStorage.getItem(pendingReservationStorageKey);

    if (!rawReservation) {
      return undefined;
    }

    try {
      const parsedReservation: unknown = JSON.parse(rawReservation);

      if (!isPendingReservation(parsedReservation)) {
        return undefined;
      }

      if (!habitaciones.some((habitacion) => habitacion.id === parsedReservation.habitacionId)) {
        return undefined;
      }

      timeoutId = window.setTimeout(() => {
        setHabitacionId(parsedReservation.habitacionId);
        setFechaIngreso(parsedReservation.fechaIngreso);
        setFechaSalida(parsedReservation.fechaSalida);
      }, 0);
    } catch {
      window.sessionStorage.removeItem(pendingReservationStorageKey);
    }

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [habitaciones]);

  useEffect(() => {
    if (!selectedRoom || !shouldScrollToSelectedRoom.current) {
      return;
    }

    shouldScrollToSelectedRoom.current = false;
    const scrollTarget = scrollTargetId ? document.getElementById(scrollTargetId) : null;

    (scrollTarget ?? roomsSectionRef.current)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [scrollTargetId, selectedRoom]);

  const selectRoom = (nextHabitacionId: string) => {
    shouldScrollToSelectedRoom.current = true;
    setHabitacionId(nextHabitacionId);
  };

  const renderRoomCard = (habitacion: Habitacion, index: number) => {
    const tarifa = tarifaByRoom.get(habitacion.id) ?? null;
    const roomImages = imagesByRoom.get(habitacion.id) ?? [];
    const selected = habitacion.id === selectedRoom?.id;
    const availability = getRoomAvailabilityStatus({
      roomId: habitacion.id,
      fechaIngreso,
      fechaSalida,
      reservas,
      bloqueos,
      staySettings,
      now,
    });
    const unavailable = hasSelectedDateRange ? !availability.available : false;
    const inactive = habitacion.activa === false;
    const disabled = !tarifa || unavailable || inactive;
    const showAvailabilityBadge = inactive || hasSelectedDateRange || !availability.available;
    const carouselActive = hoveredRoomId === habitacion.id;

    return (
      <div
        key={habitacion.id}
        onMouseEnter={() => setHoveredRoomId(habitacion.id)}
        onMouseLeave={() => setHoveredRoomId((currentRoomId) => (currentRoomId === habitacion.id ? null : currentRoomId))}
        className="h-full"
      >
        <button
          type="button"
          aria-pressed={selected}
          disabled={disabled}
          onClick={() => selectRoom(habitacion.id)}
          className={cn(
            "group h-full w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c7a35a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#18251d]",
            selected
              ? "border-[#c7a35a] ring-2 ring-[#c7a35a]"
              : "border-[#d8d4c8] dark:border-[#314237]",
          )}
        >
          <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#1d2c23]">
            <HoverRoomImageCarousel
              images={roomImages}
              alt={`Habitación ${habitacion.numero}`}
              active={carouselActive}
              priority={index < 2}
            />
            <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
              {showAvailabilityBadge ? (
                inactive ? (
                  <Badge variant="destructive">Inactiva</Badge>
                ) : (
                  <Badge variant={availability.variant}>
                    {availability.label}
                    {availability.detail ? ` · ${availability.detail}` : ""}
                  </Badge>
                )
              ) : null}
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-[#18221b] dark:text-zinc-100">Habitación {habitacion.numero}</h3>
                <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{roomTypeLabel[habitacion.tipo]}</p>
              </div>
              {selected ? <CheckCircle2 className="h-5 w-5 text-[#c7a35a]" aria-hidden="true" /> : null}
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

            <div className="flex items-end justify-between gap-3">
              {tarifa ? (
                <div>
                  <p className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">
                    {tarifa.precio_noche} {tarifa.moneda}
                  </p>
                  <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">por noche · {tarifa.temporada}</p>
                </div>
              ) : (
                <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Sin tarifa activa</p>
              )}
            </div>

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
      </div>
    );
  };

  return (
    <form
      action={formAction}
      className="space-y-6"
      onSubmit={() => {
        if (canSubmit) {
          window.sessionStorage.removeItem(pendingReservationStorageKey);
        }
      }}
    >
      <ActionToast
        state={state}
        successTitle="Reserva creada"
        errorTitle={mode === "staff" ? "No se pudo crear la reserva" : "No se pudo completar la reserva"}
      />
      {mode === "staff" ? (
        <div className="space-y-2">
          <Label htmlFor="huespedId">Huésped</Label>
          <Select name="huespedId" required>
            <SelectTrigger id="huespedId">
              <SelectValue placeholder="Seleccionar huésped" />
            </SelectTrigger>
            <SelectContent>
              {huespedes.map((huesped) => (
                <SelectItem key={huesped.id} value={huesped.id}>
                  {huespedContacts[huesped.id]?.nombre ?? "Cliente sin nombre"}{" "}
                  {huespedContacts[huesped.id]?.email ? `- ${huespedContacts[huesped.id]?.email}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage state={state} field="huespedId" />
        </div>
      ) : null}

      <div className="max-w-2xl space-y-2">
        <Label>Fechas</Label>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{stayPolicyText(staySettings)}</p>
        <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">{cancellationPolicyText(staySettings)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fechaIngreso" className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
              Ingreso
            </Label>
            <DatePickerField
              id="fechaIngreso"
              name="fechaIngreso"
              value={fechaIngreso}
              onChange={setFechaIngreso}
              placeholder="Seleccionar ingreso"
              disablePast
              required
            />
            <FormMessage state={state} field="fechaIngreso" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fechaSalida" className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
              Salida
            </Label>
            <DatePickerField
              id="fechaSalida"
              name="fechaSalida"
              value={fechaSalida}
              onChange={setFechaSalida}
              placeholder="Seleccionar salida"
              disablePast
              required
            />
            <FormMessage state={state} field="fechaSalida" />
          </div>
        </div>
      </div>

      <input name="habitacionId" type="hidden" value={selectedRoom?.id ?? ""} readOnly />
      <input name="tarifaId" type="hidden" value={selectedTarifa?.id ?? ""} readOnly />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div ref={roomsSectionRef} className="scroll-mt-4 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#18221b] dark:text-zinc-100">Habitaciones disponibles</h2>
              <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">
                Elige fechas y selecciona una habitación para completar la reserva.
              </p>
            </div>
            {nights > 0 ? <Badge variant="secondary">{nights} noches</Badge> : null}
          </div>

          <div className="space-y-8">
            {selectedRoom ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#d8d4c8] pb-2 dark:border-[#314237]">
                  <h3 className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">Habitación seleccionada</h3>
                  <Badge variant="secondary">{roomTypeLabel[selectedRoom.tipo]}</Badge>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {renderRoomCard(selectedRoom, 0)}
                </div>
              </section>
            ) : null}

            {visibleRoomGroups.map((group) => (
              <section key={group.type} className="space-y-3">
                <div className="flex items-center justify-between gap-3 border-b border-[#d8d4c8] pb-2 dark:border-[#314237]">
                  <h3 className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">{roomTypeLabel[group.type]}</h3>
                  <Badge variant="outline">
                    {group.habitaciones.length} {group.habitaciones.length === 1 ? "habitación" : "habitaciones"}
                  </Badge>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {group.habitaciones.map((habitacion, index) => renderRoomCard(habitacion, index + 1))}
                </div>
              </section>
            ))}
          </div>

          <FormMessage state={state} field="habitacionId" />
          <FormMessage state={state} field="tarifaId" />
        </div>

        <aside className="h-fit rounded-2xl border border-[#d8d4c8] bg-white p-5 shadow-[0_8px_28px_rgba(0,0,0,0.08)] dark:border-[#314237] dark:bg-[#18251d]">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">Resumen</h2>
              <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">La tarifa se asigna automáticamente.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-[#d8d4c8] p-4 text-sm dark:border-[#314237]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#66736a] dark:text-[#b7c0b4]">Habitación</span>
                <span className="font-semibold text-[#18221b] dark:text-zinc-100">
                  {selectedRoom ? `${selectedRoom.numero} · ${selectedRoom.tipo}` : "Pendiente"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#66736a] dark:text-[#b7c0b4]">Fechas</span>
                <span className="text-right font-semibold text-[#18221b] dark:text-zinc-100">
                  {fechaIngreso && fechaSalida ? `${formatDate(fechaIngreso)} - ${formatDate(fechaSalida)}` : "Pendiente"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#66736a] dark:text-[#b7c0b4]">Horarios</span>
                <span className="text-right font-semibold text-[#18221b] dark:text-zinc-100">
                  {staySettings.checkinTime} / {staySettings.checkoutTime}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#66736a] dark:text-[#b7c0b4]">Noches</span>
                <span className="font-semibold text-[#18221b] dark:text-zinc-100">{nights || "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#66736a] dark:text-[#b7c0b4]">Tarifa</span>
                <span className="font-semibold text-[#18221b] dark:text-zinc-100">
                  {selectedTarifa ? `${selectedTarifa.precio_noche} ${selectedTarifa.moneda}` : "Pendiente"}
                </span>
              </div>
            </div>

            {selectedTarifa && nights > 0 ? (
              <div className="flex items-center justify-between border-t border-[#d8d4c8] pt-4 dark:border-[#314237]">
                <span className="font-semibold text-[#18221b] dark:text-zinc-100">Total</span>
                <span className="text-xl font-semibold text-[#18221b] dark:text-zinc-100">
                  {Number(selectedTarifa.precio_noche) * nights} {selectedTarifa.moneda}
                </span>
              </div>
            ) : null}

            {selectedRoomUnavailable ? (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                La habitación no está disponible para esas fechas.
              </div>
            ) : null}

            {selectedRoomInactive ? (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                La habitación seleccionada no está activa.
              </div>
            ) : null}

            {selectedRoom && !selectedTarifa ? (
              <div className="rounded-xl bg-[#f4ecd8] p-3 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
                {mode === "staff" ? (
                  <>
                    Esta habitación no tiene tarifa activa.{" "}
                    <Link href="/admin/tarifas" className="font-semibold underline">
                      Ir a tarifas
                    </Link>
                  </>
                ) : (
                  "Esta habitación no tiene tarifa activa disponible."
                )}
              </div>
            ) : null}

            {canSubmit ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Fechas disponibles para reservar.
              </div>
            ) : null}

            <FormMessage state={state} />
            <Button type="submit" className="w-full" disabled={pending || !canSubmit}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Crear reserva
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
};

const HoverRoomImageCarousel = ({
  images,
  alt,
  active,
  priority = false,
}: {
  images: RoomImage[];
  alt: string;
  active: boolean;
  priority?: boolean;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!active || images.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % images.length);
    }, 2200);

    return () => window.clearInterval(intervalId);
  }, [active, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[#66736a] dark:text-[#b7c0b4]">
        <ImageIcon className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  const displayedIndex = active && images.length > 1 ? currentIndex % images.length : 0;
  const image = images[displayedIndex];

  return (
    <Image
      src={image.url}
      alt={alt}
      fill
      sizes="(min-width: 1280px) 280px, (min-width: 640px) 45vw, 100vw"
      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      priority={priority && displayedIndex === 0}
      unoptimized
    />
  );
};
