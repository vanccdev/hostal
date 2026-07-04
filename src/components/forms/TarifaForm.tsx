"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertTarifaAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tarifaSchema } from "@/schemas/crud";

export const TarifaForm = () => {
  const [state, action, pending] = useActionState(upsertTarifaAction, initialActionState);
  const form = useForm<z.input<typeof tarifaSchema>>({
    resolver: zodResolver(tarifaSchema),
    defaultValues: {
      habitacionTipo: "individual",
      temporada: "normal",
      precioNoche: 0,
      vigenteDesde: new Date().toISOString().slice(0, 10),
      vigenteHasta: "",
      activa: true,
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="habitacionTipo">Tipo de habitación</Label>
          <select
            id="habitacionTipo"
            {...form.register("habitacionTipo")}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="individual">Individual</option>
            <option value="matrimonial">Matrimonial</option>
            <option value="doble">Doble</option>
            <option value="triple">Triple</option>
            <option value="familiar">Familiar</option>
          </select>
          <FormMessage state={state} field="habitacionTipo" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temporada">Temporada</Label>
          <select
            id="temporada"
            {...form.register("temporada")}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="baja">Baja</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioNoche">Precio por noche</Label>
          <Input id="precioNoche" type="number" min="0" step="0.01" {...form.register("precioNoche")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigenteDesde">Vigente desde</Label>
          <Input id="vigenteDesde" type="date" {...form.register("vigenteDesde")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vigenteHasta">Vigente hasta</Label>
          <Input id="vigenteHasta" type="date" {...form.register("vigenteHasta")} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("activa")} defaultChecked />
        Activa
      </label>
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Guardar tarifa
      </Button>
    </form>
  );
};
