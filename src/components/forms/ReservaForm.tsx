"use client";

import { useActionState } from "react";
import { CalendarPlus } from "lucide-react";
import { createClientReservation, createStaffReservation } from "@/app/actions/reservas";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Habitacion, Huesped, Tarifa } from "@/types/database";

type ReservaFormProps = {
  mode: "cliente" | "staff";
  habitaciones: Habitacion[];
  tarifas: Tarifa[];
  huespedes?: Huesped[];
};

export const ReservaForm = ({ mode, habitaciones, tarifas, huespedes = [] }: ReservaFormProps) => {
  const action = mode === "cliente" ? createClientReservation : createStaffReservation;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "staff" ? (
        <div className="space-y-2">
          <Label htmlFor="huespedId">Huésped</Label>
          <select
            id="huespedId"
            name="huespedId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            <option value="">Seleccionar huésped</option>
            {huespedes.map((huesped) => (
              <option key={huesped.id} value={huesped.id}>
                {huesped.nombre_completo} {huesped.email ? `- ${huesped.email}` : ""}
              </option>
            ))}
          </select>
          <FormMessage state={state} field="huespedId" />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="habitacionId">Habitación</Label>
          <select
            id="habitacionId"
            name="habitacionId"
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
            required
          >
            <option value="">Seleccionar habitación</option>
            {habitaciones.map((habitacion) => (
              <option key={habitacion.id} value={habitacion.id}>
                {habitacion.numero ?? habitacion.nombre ?? habitacion.id} - {habitacion.estado ?? "sin estado"}
              </option>
            ))}
          </select>
          <FormMessage state={state} field="habitacionId" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tarifaId">Tarifa</Label>
          <select id="tarifaId" name="tarifaId" className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm">
            <option value="">Usar precio base</option>
            {tarifas.map((tarifa) => (
              <option key={tarifa.id} value={tarifa.id}>
                {tarifa.nombre} - {tarifa.precio_noche}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaIngreso">Ingreso</Label>
          <Input id="fechaIngreso" name="fechaIngreso" type="date" required />
          <FormMessage state={state} field="fechaIngreso" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaSalida">Salida</Label>
          <Input id="fechaSalida" name="fechaSalida" type="date" required />
          <FormMessage state={state} field="fechaSalida" />
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Crear reserva
      </Button>
    </form>
  );
};

