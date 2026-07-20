"use client";

import { useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { updateEstadoHabitacionAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { estadoHabitacionSchema, type EstadoHabitacionInput } from "@/schemas/crud";
import type { EstadoHabitacion } from "@/types/database";

type EstadoHabitacionFormProps = {
  habitacionId: string;
  initialEstado: EstadoHabitacion;
  initialNotas?: string | null;
};

const estadoOptions: Array<{ value: EstadoHabitacion; label: string }> = [
  { value: "disponible", label: "Disponible" },
  { value: "limpieza", label: "Limpieza" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "ocupada", label: "Ocupada" },
];

export const EstadoHabitacionForm = ({ habitacionId, initialEstado, initialNotas }: EstadoHabitacionFormProps) => {
  const [state, action, pending] = useActionState(updateEstadoHabitacionAction, initialActionState);
  const actionData = state.data as { values?: EstadoHabitacionInput } | undefined;
  const form = useForm<z.input<typeof estadoHabitacionSchema>>({
    resolver: zodResolver(estadoHabitacionSchema),
    defaultValues: {
      habitacionId,
      estado: initialEstado,
      notas: initialNotas ?? "",
    },
  });
  const estado = useWatch({ control: form.control, name: "estado" }) ?? initialEstado;

  useEffect(() => {
    if (!state.ok && actionData?.values) {
      form.reset(actionData.values);
    }
  }, [actionData?.values, form, state.ok]);

  return (
    <form action={action} className="space-y-3" onSubmit={() => form.trigger()}>
      <ActionToast state={state} successTitle="Estado actualizado" errorTitle="No se pudo cambiar el estado" />
      <input type="hidden" value={habitacionId} {...form.register("habitacionId")} />
      <input type="hidden" name="estado" value={estado} />

      <div className="grid gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Estado operativo</Label>
          <Select
            value={estado}
            onValueChange={(value) => form.setValue("estado", value as EstadoHabitacion, { shouldDirty: true, shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {estadoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage state={state} field="estado" />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`notas-${habitacionId}`}>Notas</Label>
          <Textarea
            id={`notas-${habitacionId}`}
            className="min-h-12"
            placeholder="Ej. Baño revisado, falta toalla, pintar pared."
            {...form.register("notas")}
          />
        </div>

        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Guardar
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
};
