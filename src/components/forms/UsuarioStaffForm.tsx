"use client";

import { useActionState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldPlus } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { createStaffUserAction } from "@/app/actions/usuarios";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { staffUserSchema, type StaffUserFormValues, type StaffUserInput } from "@/schemas/usuarios";

const roleOptions = [
  { value: "admin", label: "Administrador" },
  { value: "recepcionista", label: "Recepcionista" },
  { value: "limpieza", label: "Limpieza" },
] as const;

export const UsuarioStaffForm = () => {
  const [state, action, pending] = useActionState(createStaffUserAction, initialActionState);
  const actionData = state.data as { values?: StaffUserFormValues } | undefined;
  const form = useForm<StaffUserInput>({
    resolver: zodResolver(staffUserSchema),
    defaultValues: {
      nombreCompleto: "",
      email: "",
      telefono: "",
      rol: undefined,
      password: "",
      passwordConfirm: "",
    },
  });

  useEffect(() => {
    if (!state.ok && actionData?.values) {
      form.reset({
        ...actionData.values,
        password: "",
        passwordConfirm: "",
      });
    }
  }, [actionData?.values, form, state.ok]);

  useEffect(() => {
    if (state.ok) {
      form.reset({
        nombreCompleto: "",
        email: "",
        telefono: "",
        rol: undefined,
        password: "",
        passwordConfirm: "",
      });
    }
  }, [form, state.ok]);

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast state={state} successTitle="Usuario creado" errorTitle="No se pudo crear el usuario" />
      {state.ok ? (
        <Alert>
          <AlertTitle>{state.message}</AlertTitle>
          <AlertDescription>
            El nuevo usuario debe ingresar con el email y la contraseña temporal definida.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="staff-nombreCompleto">Nombre completo</Label>
          <Input id="staff-nombreCompleto" {...form.register("nombreCompleto")} />
          <FormMessage state={state} field="nombreCompleto" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" type="email" {...form.register("email")} />
          <FormMessage state={state} field="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-telefono">Teléfono</Label>
          <Input id="staff-telefono" {...form.register("telefono")} />
          <FormMessage state={state} field="telefono" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="staff-rol">Rol</Label>
          <Controller
            control={form.control}
            name="rol"
            render={({ field }) => (
              <Select
                name={field.name}
                onValueChange={(value) => field.onChange(value === "__none" ? undefined : value)}
                value={field.value || "__none"}
              >
                <SelectTrigger id="staff-rol">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Seleccionar rol</SelectItem>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormMessage state={state} field="rol" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Contraseña temporal</Label>
          <Input id="staff-password" type="password" autoComplete="new-password" {...form.register("password")} />
          <FormMessage state={state} field="password" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-passwordConfirm">Confirmar contraseña</Label>
          <Input id="staff-passwordConfirm" type="password" autoComplete="new-password" {...form.register("passwordConfirm")} />
          <FormMessage state={state} field="passwordConfirm" />
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <ShieldPlus className="h-4 w-4" aria-hidden="true" />
        {pending ? "Creando..." : "Crear usuario del sistema"}
      </Button>
    </form>
  );
};
