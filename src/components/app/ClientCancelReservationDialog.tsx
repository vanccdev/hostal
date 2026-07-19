"use client";

import { useActionState, useMemo, useState } from "react";
import { Ban, Calculator } from "lucide-react";
import { cancelOwnReservationAction } from "@/app/actions/cancelaciones";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateCancellationPolicy } from "@/lib/cancellation-policy";
import { formatDateTime } from "@/lib/datetime";
import type { StaySettings } from "@/lib/stay-settings";
import type { Reserva } from "@/types/database";

type ClientCancelReservationDialogProps = {
  reserva: Pick<Reserva, "id" | "codigo_reserva" | "estado" | "fecha_ingreso" | "checkin_programado_at">;
  paidAmount: number;
  currency: string;
  settings: StaySettings;
};

const moneyFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value: number, currency: string) => `${moneyFormatter.format(value)} ${currency}`;

export const ClientCancelReservationDialog = ({
  reserva,
  paidAmount,
  currency,
  settings,
}: ClientCancelReservationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(cancelOwnReservationAction, initialActionState);
  const policy = useMemo(
    () =>
      calculateCancellationPolicy({
        paidAmount,
        checkinAt: reserva.checkin_programado_at,
        fallbackDate: reserva.fecha_ingreso,
        settings,
      }),
    [paidAmount, reserva.checkin_programado_at, reserva.fecha_ingreso, settings],
  );
  const canCancel = reserva.estado === "pendiente_pago" || reserva.estado === "confirmada";

  if (!canCancel) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm">
          <Ban className="h-4 w-4" aria-hidden="true" />
          Cancelar reserva
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar {reserva.codigo_reserva}</DialogTitle>
          <DialogDescription>
            Se liberará la habitación y se guardará el resultado contable de acuerdo con la política vigente.
          </DialogDescription>
        </DialogHeader>
        <ActionToast state={state} successTitle="Reserva cancelada" errorTitle="No se pudo cancelar" />
        <div className="space-y-4">
          <div className="rounded-xl border border-[#d8d4c8] bg-[#f8f5ec] p-4 text-sm dark:border-[#314237] dark:bg-[#142019]">
            <div className="flex items-start gap-2">
              <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-[#c7a35a]" aria-hidden="true" />
              <div className="space-y-2">
                <p className="font-semibold text-[#18221b] dark:text-zinc-100">Cálculo de cancelación</p>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <Metric label="Check-in" value={formatDateTime(policy.checkinAt.toISOString())} />
                  <Metric label="Corte sin retención" value={formatDateTime(policy.cutoffAt.toISOString())} />
                  <Metric label="Pagado aprobado" value={formatMoney(paidAmount, currency)} />
                  <Metric label="Monto final hostal" value={formatMoney(policy.retainedAmount, currency)} />
                  <Metric label="Monto no retenido" value={formatMoney(policy.refundAmount, currency)} />
                  <Metric label="Política" value={policy.policy} />
                </dl>
              </div>
            </div>
          </div>
          <form action={action} className="space-y-3">
            <input type="hidden" name="reservaId" value={reserva.id} />
            <div className="space-y-2">
              <Label htmlFor={`motivo-cliente-${reserva.id}`}>Motivo</Label>
              <Textarea
                id={`motivo-cliente-${reserva.id}`}
                name="motivo"
                required
                minLength={5}
                placeholder="Ej. Necesito cancelar por cambio de planes."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Mantener reserva
              </Button>
              <Button type="submit" variant="destructive" disabled={pending}>
                {pending ? "Cancelando..." : "Confirmar cancelación"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</dt>
    <dd className="mt-0.5 font-medium text-[#18221b] dark:text-zinc-100">{value}</dd>
  </div>
);
