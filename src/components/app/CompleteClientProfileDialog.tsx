"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { completeClientProfileAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { completeClientProfileSchema, type CompleteClientProfileInput } from "@/schemas/auth";
import type { Huesped } from "@/types/database";

type CompleteClientProfileDialogProps = {
  guest: Pick<Huesped, "nombre_completo" | "telefono" | "tipo_documento" | "numero_documento" | "pais_origen"> | null;
  profileName: string;
};

export const CompleteClientProfileDialog = ({ guest, profileName }: CompleteClientProfileDialogProps) => {
  const [state, action, pending] = useActionState(completeClientProfileAction, initialActionState);
  const form = useForm<CompleteClientProfileInput>({
    resolver: zodResolver(completeClientProfileSchema),
    defaultValues: {
      nombre: guest?.nombre_completo ?? profileName,
      telefono: guest?.telefono ?? "",
      tipoDocumento: guest?.tipo_documento === "Otro" ? undefined : guest?.tipo_documento,
      numeroDocumento: "",
      pais: guest?.pais_origen ?? "",
    },
  });

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Completa tu perfil</DialogTitle>
          <DialogDescription>Necesitamos estos datos para asociar tus reservas correctamente.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
          <ActionToast state={state} successTitle="Perfil actualizado" errorTitle="No se pudo actualizar el perfil" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" autoComplete="name" {...form.register("nombre")} />
              <FormMessage state={state} field="nombre" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Número de celular o teléfono</Label>
              <Input id="telefono" autoComplete="tel" {...form.register("telefono")} />
              <FormMessage state={state} field="telefono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoDocumento">Tipo documento</Label>
              <Select name="tipoDocumento" defaultValue={form.getValues("tipoDocumento") ?? "__none"}>
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
