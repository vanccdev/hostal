"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { completeClientProfileAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { DatePickerField } from "@/components/forms/DatePickerField";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPendingDocumentNumber } from "@/lib/client-profile";
import { completeClientProfileSchema, type CompleteClientProfileInput } from "@/schemas/auth";
import type { Huesped } from "@/types/database";

type CompleteClientProfileDialogProps = {
  guest: Pick<Huesped, "tipo_documento" | "numero_documento" | "pais_origen" | "fecha_nacimiento"> | null;
  initialPhone: string | null;
  profileName: string;
};

export const CompleteClientProfileDialog = ({ guest, initialPhone, profileName }: CompleteClientProfileDialogProps) => {
  const [state, action, pending] = useActionState(completeClientProfileAction, initialActionState);
  const hasPendingDocument = isPendingDocumentNumber(guest?.numero_documento);
  const knownPhone = initialPhone ?? "";
  const form = useForm<CompleteClientProfileInput>({
    resolver: zodResolver(completeClientProfileSchema),
    defaultValues: {
      nombre: profileName,
      telefono: knownPhone,
      tipoDocumento: hasPendingDocument ? undefined : guest?.tipo_documento,
      numeroDocumento: hasPendingDocument ? "" : (guest?.numero_documento ?? ""),
      fechaNacimiento: guest?.fecha_nacimiento ?? "",
      pais: guest?.pais_origen ?? "",
    },
  });
  const localError = (field: keyof CompleteClientProfileInput) => form.formState.errors[field]?.message;

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Completa tu perfil</DialogTitle>
          <DialogDescription>Necesitamos estos datos para asociar tus reservas correctamente.</DialogDescription>
        </DialogHeader>
        <form
          action={action}
          className="space-y-4"
          onSubmit={async (event) => {
            const isValid = await form.trigger();

            if (!isValid) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <ActionToast state={state} successTitle="Perfil actualizado" errorTitle="No se pudo actualizar el perfil" />
          <div className="grid gap-4 sm:grid-cols-2">
            {knownPhone ? <input type="hidden" value={knownPhone} {...form.register("telefono")} /> : null}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" autoComplete="name" {...form.register("nombre")} />
              {localError("nombre") ? <p className="text-sm text-red-600">{localError("nombre")}</p> : null}
              <FormMessage state={state} field="nombre" />
            </div>
            {!knownPhone ? (
              <div className="space-y-2">
                <Label htmlFor="telefono">Número de celular o teléfono</Label>
                <Input id="telefono" autoComplete="tel" {...form.register("telefono")} />
                {localError("telefono") ? <p className="text-sm text-red-600">{localError("telefono")}</p> : null}
                <FormMessage state={state} field="telefono" />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento">Tipo documento</Label>
              <Controller
                control={form.control}
                name="tipoDocumento"
                render={({ field }) => (
                  <Select
                    name={field.name}
                    value={field.value ?? "__none"}
                    onValueChange={(value) => field.onChange(value === "__none" ? undefined : value)}
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
                )}
              />
              {localError("tipoDocumento") ? <p className="text-sm text-red-600">{localError("tipoDocumento")}</p> : null}
              <FormMessage state={state} field="tipoDocumento" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento">Número de documento / CI</Label>
              <Input id="numeroDocumento" {...form.register("numeroDocumento")} />
              {localError("numeroDocumento") ? <p className="text-sm text-red-600">{localError("numeroDocumento")}</p> : null}
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
              {localError("fechaNacimiento") ? <p className="text-sm text-red-600">{localError("fechaNacimiento")}</p> : null}
              <FormMessage state={state} field="fechaNacimiento" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pais">País</Label>
              <Input id="pais" autoComplete="country-name" {...form.register("pais")} />
            </div>
          </div>
          <FormMessage state={state} />
          <Button type="submit" disabled={pending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Guardar perfil
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
