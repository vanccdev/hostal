"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { BedDouble } from "lucide-react";
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
      nombre: "",
      tipo: "",
      capacidad: 1,
      precioBase: 0,
      estado: "disponible",
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
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" {...form.register("nombre")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Input id="tipo" {...form.register("tipo")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacidad">Capacidad</Label>
          <Input id="capacidad" type="number" min="1" {...form.register("capacidad")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioBase">Precio base</Label>
          <Input id="precioBase" type="number" min="0" step="0.01" {...form.register("precioBase")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Input id="estado" {...form.register("estado")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea id="descripcion" {...form.register("descripcion")} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("activa")} defaultChecked />
        Activa
      </label>
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        <BedDouble className="h-4 w-4" aria-hidden="true" />
        Guardar habitación
      </Button>
    </form>
  );
};
