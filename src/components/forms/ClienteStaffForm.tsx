"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { createClientAccountByStaff } from "@/app/actions/clientes";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clienteStaffSchema, type ClienteStaffInput } from "@/schemas/clientes";

export const ClienteStaffForm = () => {
  const [state, action, pending] = useActionState(createClientAccountByStaff, initialActionState);
  const createdData = state.data as { initialPassword?: string } | undefined;
  const form = useForm<ClienteStaffInput>({
    resolver: zodResolver(clienteStaffSchema),
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
      {state.ok ? (
        <Alert>
          <AlertTitle>{state.message}</AlertTitle>
          <AlertDescription>
            Contraseña inicial: <strong>{createdData?.initialPassword}</strong>
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="nombreCompleto">Nombre completo</Label>
          <Input id="nombreCompleto" {...form.register("nombreCompleto")} />
          <FormMessage state={state} field="nombreCompleto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...form.register("email")} />
          <FormMessage state={state} field="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...form.register("telefono")} />
          <FormMessage state={state} field="telefono" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tipoDocumento">Tipo documento</Label>
          <Select name="tipoDocumento" defaultValue="__none">
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
      <Button type="submit" disabled={pending}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Crear cliente
      </Button>
    </form>
  );
};
