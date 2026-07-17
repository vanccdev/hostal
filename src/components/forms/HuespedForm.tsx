"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { upsertHuespedAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPendingDocumentNumber } from "@/lib/client-profile";
import { huespedSchema, type HuespedInput } from "@/schemas/crud";
import type { Huesped } from "@/types/database";

type HuespedFormProps = {
  huesped?: Huesped;
  onSuccess?: () => void;
};

export const HuespedForm = ({ huesped, onSuccess }: HuespedFormProps) => {
  const [state, action, pending] = useActionState(upsertHuespedAction, initialActionState);
  const form = useForm<HuespedInput>({
    resolver: zodResolver(huespedSchema),
    defaultValues: {
      id: huesped?.id,
      nombreCompleto: huesped?.nombre_completo ?? "",
      email: huesped?.email ?? "",
      telefono: huesped?.telefono ?? "",
      tipoDocumento: huesped?.tipo_documento,
      numeroDocumento: isPendingDocumentNumber(huesped?.numero_documento) ? "" : (huesped?.numero_documento ?? ""),
      pais: huesped?.pais_origen ?? "",
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast
        state={state}
        successTitle={huesped ? "Huésped actualizado" : "Huésped creado"}
        errorTitle="No se pudo guardar el huésped"
        onSuccess={onSuccess}
      />
      {huesped ? <input type="hidden" value={huesped.id} {...form.register("id")} /> : null}
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
          <Select name="tipoDocumento" defaultValue={huesped?.tipo_documento ?? "__none"}>
            <SelectTrigger id="tipoDocumento">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Seleccionar</SelectItem>
              <SelectItem value="CI">CI</SelectItem>
              <SelectItem value="Pasaporte">Pasaporte</SelectItem>
              <SelectItem value="DNI">DNI</SelectItem>
              <SelectItem value="RUC">RUC</SelectItem>
              <SelectItem value="Otro">Otro</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage state={state} field="tipoDocumento" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="numeroDocumento">Número documento</Label>
          <Input id="numeroDocumento" {...form.register("numeroDocumento")} />
          <FormMessage state={state} field="numeroDocumento" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input id="pais" {...form.register("pais")} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {huesped ? "Actualizar huésped" : "Guardar huésped"}
      </Button>
    </form>
  );
};
