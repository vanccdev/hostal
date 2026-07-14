"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { loginAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/schemas/auth";

type LoginFormProps = {
  nextPath?: string;
};

export const LoginForm = ({ nextPath }: LoginFormProps) => {
  const [state, action, pending] = useActionState(loginAction, initialActionState);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast state={state} errorTitle="No se pudo iniciar sesión" />
      {nextPath ? <input name="next" type="hidden" value={nextPath} readOnly /> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
        <FormMessage state={state} field="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
        <FormMessage state={state} field="password" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Ingresar
      </Button>
    </form>
  );
};
