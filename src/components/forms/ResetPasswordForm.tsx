"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { resetClientPasswordToPhone } from "@/app/actions/password";
import { initialActionState } from "@/app/actions/types";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";

type ResetPasswordFormProps = {
  userId: string;
};

export const ResetPasswordForm = ({ userId }: ResetPasswordFormProps) => {
  const [state, action, pending] = useActionState(resetClientPasswordToPhone, initialActionState);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="userId" value={userId} />
      <FormMessage state={state} />
      {state.ok ? <p className="text-sm text-emerald-700">{state.message}</p> : null}
      <Button type="submit" disabled={pending}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        Restablecer al teléfono
      </Button>
    </form>
  );
};

