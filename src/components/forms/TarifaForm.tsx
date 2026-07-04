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
      nombre: "",
      precioNoche: 0,
      activa: true,
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" {...form.register("nombre")} />
          <FormMessage state={state} field="nombre" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="precioNoche">Precio por noche</Label>
          <Input id="precioNoche" type="number" min="0" step="0.01" {...form.register("precioNoche")} />
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
