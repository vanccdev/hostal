"use client";

import { useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { updateClientProfileAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isPendingDocumentNumber } from "@/lib/client-profile";
import { updateClientProfileSchema, type UpdateClientProfileInput } from "@/schemas/auth";
import type { Huesped } from "@/types/database";

type ProfileEditFormProps = {
  email: string;
  nombre: string;
  telefono: string;
  guest: Huesped | null;
};

export const ProfileEditForm = ({ email, nombre, telefono, guest }: ProfileEditFormProps) => {
  const [state, action, pending] = useActionState(updateClientProfileAction, initialActionState);
  const form = useForm<UpdateClientProfileInput>({
    resolver: zodResolver(updateClientProfileSchema),
    defaultValues: {
      nombre,
      email,
      telefono,
      tipoDocumento: isPendingDocumentNumber(guest?.numero_documento) ? undefined : guest?.tipo_documento,
      numeroDocumento: isPendingDocumentNumber(guest?.numero_documento) ? "" : (guest?.numero_documento ?? ""),
      fechaNacimiento: guest?.fecha_nacimiento ?? "",
      pais: guest?.pais_origen ?? "",
      observaciones: guest?.observaciones ?? "",
    },
  });
  const fechaNacimiento = useWatch({ control: form.control, name: "fechaNacimiento" });
  const tipoDocumento = useWatch({ control: form.control, name: "tipoDocumento" });

  useEffect(() => {
    if (state.ok && state.data) {
      form.reset(state.data);
    }
  }, [form, state]);

  return (
    <form action={action} className="space-y-5" onSubmit={() => form.trigger()}>
      <ActionToast state={state} successTitle="Perfil actualizado" errorTitle="No se pudo actualizar el perfil" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre completo</Label>
          <Input id="nombre" autoComplete="name" {...form.register("nombre")} />
          <FormMessage state={state} field="nombre" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          <FormMessage state={state} field="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Número de celular o teléfono</Label>
          <Input id="telefono" autoComplete="tel" {...form.register("telefono")} />
          <FormMessage state={state} field="telefono" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipoDocumento">Tipo documento</Label>
          <Select
            name="tipoDocumento"
            value={tipoDocumento ?? "__none"}
            onValueChange={(value) =>
              form.setValue(
                "tipoDocumento",
                value === "__none"
                  ? (undefined as unknown as UpdateClientProfileInput["tipoDocumento"])
                  : (value as UpdateClientProfileInput["tipoDocumento"]),
                { shouldDirty: true },
              )
            }
          >
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
          <Label htmlFor="numeroDocumento">Número de documento / CI</Label>
          <Input id="numeroDocumento" {...form.register("numeroDocumento")} />
          <FormMessage state={state} field="numeroDocumento" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
          <DatePickerField
            id="fechaNacimiento"
            name="fechaNacimiento"
            value={fechaNacimiento}
            onChange={(value) => form.setValue("fechaNacimiento", value, { shouldDirty: true })}
            placeholder="Seleccionar fecha"
            showMonthYearSelect
          />
          <FormMessage state={state} field="fechaNacimiento" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pais">País</Label>
          <Input id="pais" autoComplete="country-name" {...form.register("pais")} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="observaciones">Observaciones</Label>
          <Textarea id="observaciones" rows={4} {...form.register("observaciones")} />
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        Guardar cambios
      </Button>
    </form>
  );
};
