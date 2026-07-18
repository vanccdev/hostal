"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { verifyReservationProofAction } from "@/app/actions/comprobantes";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { Button } from "@/components/ui/button";

type ComprobanteVerificationActionsProps = {
  reservaId: string;
};

export const ComprobanteVerificationActions = ({ reservaId }: ComprobanteVerificationActionsProps) => {
  const [state, action, pending] = useActionState(verifyReservationProofAction, initialActionState);

  return (
    <div className="flex flex-wrap gap-2">
      <ActionToast
        state={state}
        successTitle="Comprobante verificado"
        errorTitle="No se pudo verificar el comprobante"
      />
      <form action={action}>
        <input type="hidden" name="reservaId" value={reservaId} />
        <input type="hidden" name="decision" value="aprobar" />
        <Button type="submit" disabled={pending}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Confirmar reserva
        </Button>
      </form>
      <form action={action}>
        <input type="hidden" name="reservaId" value={reservaId} />
        <input type="hidden" name="decision" value="rechazar" />
        <Button type="submit" variant="destructive" disabled={pending}>
          <XCircle className="h-4 w-4" aria-hidden="true" />
          Rechazar comprobante
        </Button>
      </form>
    </div>
  );
};
