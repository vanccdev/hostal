"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { signupAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema, type SignupInput } from "@/schemas/auth";

type SignupFormProps = {
  nextPath?: string;
};

export const SignupForm = ({ nextPath }: SignupFormProps) => {
  const [state, action, pending] = useActionState(signupAction, initialActionState);
  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nombre: "",
      email: "",
      password: "",
      telefono: "",
      documento: "",
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast state={state} successTitle="Cuenta creada" errorTitle="No se pudo crear la cuenta" />
      {nextPath ? <input name="next" type="hidden" value={nextPath} readOnly /> : null}
      <div className="space-y-2">
        <Label htmlFor="nombre">Nombre</Label>
        <Input id="nombre" autoComplete="name" {...form.register("nombre")} />
        <FormMessage state={state} field="nombre" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        <FormMessage state={state} field="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <FormMessage state={state} field="password" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" autoComplete="tel" {...form.register("telefono")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="documento">Documento</Label>
          <Input id="documento" {...form.register("documento")} />
        </div>
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Crear cuenta
      </Button>
    </form>
  );
};
