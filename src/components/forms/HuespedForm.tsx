"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { upsertHuespedAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { huespedSchema, type HuespedInput } from "@/schemas/crud";

export const HuespedForm = () => {
  const [state, action, pending] = useActionState(upsertHuespedAction, initialActionState);
  const form = useForm<HuespedInput>({
    resolver: zodResolver(huespedSchema),
    defaultValues: {
      nombreCompleto: "",
      email: "",
      telefono: "",
      tipoDocumento: "",
      numeroDocumento: "",
      pais: "",
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombreCompleto">Nombre completo</Label>
          <Input id="nombreCompleto" {...form.register("nombreCompleto")} />
          <FormMessage state={state} field="nombreCompleto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...form.register("telefono")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipoDocumento">Tipo documento</Label>
          <select
            id="tipoDocumento"
            {...form.register("tipoDocumento")}
            className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">Seleccionar</option>
            <option value="CI">CI</option>
            <option value="Pasaporte">Pasaporte</option>
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="numeroDocumento">Número documento</Label>
          <Input id="numeroDocumento" {...form.register("numeroDocumento")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input id="pais" {...form.register("pais")} />
        </div>
      </div>
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Guardar huésped
      </Button>
    </form>
  );
};
