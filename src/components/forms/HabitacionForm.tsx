"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble, ImageUp } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { upsertHabitacionAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { habitacionSchema } from "@/schemas/crud";

export const HabitacionForm = () => {
  const [state, action, pending] = useActionState(upsertHabitacionAction, initialActionState);
  const form = useForm<z.input<typeof habitacionSchema>>({
    resolver: zodResolver(habitacionSchema),
    defaultValues: {
      numero: "",
      tipo: "individual",
      piso: 1,
      capacidadMax: 1,
      descripcion: "",
      activa: true,
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...form.register("numero")} />
          <FormMessage state={state} field="numero" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <select
            id="tipo"
            {...form.register("tipo")}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="individual">Individual</option>
            <option value="matrimonial">Matrimonial</option>
            <option value="doble">Doble</option>
            <option value="triple">Triple</option>
            <option value="familiar">Familiar</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="piso">Piso</Label>
          <Input id="piso" type="number" min="1" {...form.register("piso")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacidadMax">Capacidad máxima</Label>
          <Input id="capacidadMax" type="number" min="1" {...form.register("capacidadMax")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" {...form.register("descripcion")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="imagenes">Imágenes</Label>
          <Input id="imagenes" name="imagenes" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">JPG, PNG, WEBP o GIF. Máximo 5 MB por imagen.</p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("activa")} defaultChecked />
        Activa
      </label>
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <ImageUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <BedDouble className="h-4 w-4" aria-hidden="true" />
        )}
        Guardar habitación
      </Button>
    </form>
  );
};
