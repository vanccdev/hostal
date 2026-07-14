"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetClientPasswordToPhone } from "@/app/actions/password";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";

type ResetPasswordFormProps = {
  userId: string;
};

export const ResetPasswordForm = ({ userId }: ResetPasswordFormProps) => {
  const [state, action, pending] = useActionState(resetClientPasswordToPhone, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <ActionToast state={state} successTitle="Contraseña restablecida" errorTitle="No se pudo restablecer la contraseña" />
      <input type="hidden" name="userId" value={userId} />
      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Restablecer al teléfono
      </Button>
    </form>
  );
};
