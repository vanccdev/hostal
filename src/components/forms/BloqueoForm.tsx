"use client";

import { useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarX2, CheckCircle2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { createBloqueoFechasAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { localISODate } from "@/lib/datetime";
import { bloqueoSchema, type BloqueoInput } from "@/schemas/crud";
import type { Habitacion } from "@/types/database";

type BloqueoFormProps = {
  blockedRoomIds: string[];
  habitaciones: Habitacion[];
};

const tomorrowISODate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return localISODate(tomorrow);
};

export const BloqueoForm = ({ blockedRoomIds, habitaciones }: BloqueoFormProps) => {
  const [state, action, pending] = useActionState(createBloqueoFechasAction, initialActionState);
  const actionData = state.data as { values?: BloqueoInput } | undefined;
  const form = useForm<z.input<typeof bloqueoSchema>>({
    resolver: zodResolver(bloqueoSchema),
    defaultValues: {
      scope: "una",
      habitacionIds: [],
      fechaInicio: localISODate(),
      fechaFin: tomorrowISODate(),
      motivo: "",
    },
  });
  const scope = useWatch({ control: form.control, name: "scope" }) ?? "una";
  const selectedRoomIds = useWatch({ control: form.control, name: "habitacionIds" }) ?? [];
  const fechaInicio = useWatch({ control: form.control, name: "fechaInicio" }) ?? localISODate();
  const fechaFin = useWatch({ control: form.control, name: "fechaFin" }) ?? tomorrowISODate();
  const roomSelectionDisabled = scope === "todas";
  const blockedRoomIdSet = new Set(blockedRoomIds);
  const sortedRooms = [...habitaciones].sort((a, b) => {
    const aBlocked = blockedRoomIdSet.has(a.id) ? 0 : 1;
    const bBlocked = blockedRoomIdSet.has(b.id) ? 0 : 1;

    return aBlocked - bBlocked || a.numero.localeCompare(b.numero, "es", { numeric: true });
  });

  useEffect(() => {
    if (!state.ok && actionData?.values) {
      form.reset(actionData.values);
    }
  }, [actionData?.values, form, state.ok]);

  const toggleRoom = (roomId: string) => {
    const nextRoomIds =
      scope === "una"
        ? selectedRoomIds.includes(roomId)
          ? []
          : [roomId]
        : selectedRoomIds.includes(roomId)
          ? selectedRoomIds.filter((id) => id !== roomId)
          : [...selectedRoomIds, roomId];

    form.setValue("habitacionIds", nextRoomIds, { shouldDirty: true, shouldValidate: true });
  };

  const handleScopeChange = (nextScope: BloqueoInput["scope"]) => {
    form.setValue("scope", nextScope, { shouldDirty: true, shouldValidate: true });

    if (nextScope === "todas") {
      form.setValue("habitacionIds", [], { shouldDirty: true, shouldValidate: true });
    } else if (nextScope === "una" && selectedRoomIds.length > 1) {
      const firstRoom = selectedRoomIds.slice(0, 1);
      form.setValue("habitacionIds", firstRoom, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <form
      action={action}
      className="space-y-5"
      onSubmit={() => {
        form.setValue("scope", scope, { shouldValidate: true });
        form.setValue("habitacionIds", selectedRoomIds, { shouldValidate: true });
        form.trigger();
      }}
    >
      <ActionToast state={state} successTitle="Bloqueo creado" errorTitle="No se pudo crear el bloqueo" />
      <input type="hidden" name="scope" value={scope} />
      {selectedRoomIds.map((roomId) => (
        <input key={roomId} type="hidden" name="habitacionIds" value={roomId} />
      ))}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-2">
          <Label htmlFor="scope">Alcance</Label>
          <Select value={scope} onValueChange={(value) => handleScopeChange(value as BloqueoInput["scope"])}>
            <SelectTrigger id="scope">
              <SelectValue placeholder="Seleccionar alcance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="una">Una habitación</SelectItem>
              <SelectItem value="varias">Varias habitaciones</SelectItem>
              <SelectItem value="todas">Todo el hostal</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage state={state} field="scope" />
        </div>

        <div className="space-y-2">
          <Label>Habitaciones</Label>
          <div className="grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-[#d8d4c8] bg-[#f8f5ec] p-3 dark:border-[#314237] dark:bg-[#142019] sm:grid-cols-2 xl:grid-cols-3">
            {roomSelectionDisabled ? (
              <div className="rounded-lg border border-dashed border-[#c7a35a] bg-white p-3 text-sm font-medium text-[#66736a] dark:bg-[#18251d] dark:text-[#b7c0b4] sm:col-span-2 xl:col-span-3">
                Se bloquearán todas las habitaciones del hostal.
              </div>
            ) : (
              sortedRooms.map((habitacion) => {
                const selected = selectedRoomIds.includes(habitacion.id);
                const alreadyBlocked = blockedRoomIdSet.has(habitacion.id);

                return (
                  <label
                    key={habitacion.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      selected
                        ? "border-[#c7a35a] bg-white text-[#18221b] dark:bg-[#2b2618] dark:text-zinc-100"
                        : "border-[#e5decd] bg-white/70 text-[#66736a] hover:border-[#c7a35a] dark:border-[#314237] dark:bg-[#18251d] dark:text-[#b7c0b4]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleRoom(habitacion.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        Habitación {habitacion.numero}
                        {alreadyBlocked ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            Bloqueada
                          </Badge>
                        ) : null}
                      </span>
                      <span className="text-xs">
                        {habitacion.tipo} · Piso {habitacion.piso} · Cap. {habitacion.capacidad_max}
                      </span>
                    </span>
                  </label>
                );
              })
            )}
          </div>
          <FormMessage state={state} field="habitacionIds" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fechaInicio">Inicio del bloqueo</Label>
          <DatePickerField
            id="fechaInicio"
            name="fechaInicio"
            value={fechaInicio}
            onChange={(value) => {
              form.setValue("fechaInicio", value, { shouldDirty: true, shouldValidate: true });
            }}
            disablePast
            required
          />
          <FormMessage state={state} field="fechaInicio" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaFin">Fin / fecha de liberación</Label>
          <DatePickerField
            id="fechaFin"
            name="fechaFin"
            value={fechaFin}
            onChange={(value) => {
              form.setValue("fechaFin", value, { shouldDirty: true, shouldValidate: true });
            }}
            disablePast
            required
          />
          <FormMessage state={state} field="fechaFin" />
          <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
            La habitación vuelve a estar disponible en esta fecha.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo</Label>
        <Textarea id="motivo" placeholder="Ej. Mantenimiento, evento, fumigación, cierre operativo." {...form.register("motivo")} />
        <FormMessage state={state} field="motivo" />
      </div>

      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <CalendarX2 className="h-4 w-4" aria-hidden="true" />
        Crear bloqueo
      </Button>
    </form>
  );
};
