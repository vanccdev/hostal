"use client";

import { useActionState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { changePasswordAction } from "@/app/actions/auth";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/auth";

export const ChangePasswordForm = () => {
  const [state, action, pending] = useActionState(changePasswordAction, initialActionState);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  return (
    <form action={action} className="space-y-4" onSubmit={() => form.trigger()}>
      <ActionToast state={state} successTitle="Contraseña actualizada" errorTitle="No se pudo cambiar la contraseña" />
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" type="password" autoComplete="new-password" {...form.register("password")} />
        <FormMessage state={state} field="password" />
      </div>
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Cambiar contraseña
      </Button>
    </form>
  );
};
