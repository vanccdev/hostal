"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { upsertHuespedAction } from "@/app/actions/crud";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { DatePickerField } from "@/components/forms/DatePickerField";
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
      id: huesped?.id ?? "",
      tipoDocumento: huesped?.tipo_documento,
      numeroDocumento: isPendingDocumentNumber(huesped?.numero_documento) ? "" : (huesped?.numero_documento ?? ""),
      fechaNacimiento: huesped?.fecha_nacimiento ?? "",
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
      <input type="hidden" value={huesped?.id ?? ""} {...form.register("id")} />
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
          <DatePickerField
            id="fechaNacimiento"
            name="fechaNacimiento"
            defaultValue={form.getValues("fechaNacimiento")}
            placeholder="Seleccionar fecha"
            showMonthYearSelect
          />
          <FormMessage state={state} field="fechaNacimiento" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pais">País</Label>
          <Input id="pais" {...form.register("pais")} />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Actualizar huésped
      </Button>
    </form>
  );
};
