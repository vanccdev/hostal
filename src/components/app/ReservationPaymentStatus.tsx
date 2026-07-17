"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileCheck2, FileUp, ShieldCheck, TriangleAlert } from "lucide-react";
import { uploadReservationProofAction } from "@/app/actions/comprobantes";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ReservaEstado } from "@/types/database";

type ReservationPaymentStatusProps = {
  reservaId: string;
  codigoReserva: string;
  estado: ReservaEstado;
  createdAt: string;
  timeoutMinutes: number;
  hasProof: boolean;
  proofUrl?: string | null;
  userId: string;
};

const formatRemaining = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
};

export const ReservationPaymentStatus = ({
  reservaId,
  codigoReserva,
  estado,
  createdAt,
  timeoutMinutes,
  hasProof,
  proofUrl,
  userId,
}: ReservationPaymentStatusProps) => {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadReservationProofAction, initialActionState);
  const [currentEstado, setCurrentEstado] = useState<ReservaEstado>(estado);
  const [currentHasProof, setCurrentHasProof] = useState(hasProof);
  const [lastMessage, setLastMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const deadline = useMemo(
    () => (timeoutMinutes > 0 ? new Date(createdAt).getTime() + timeoutMinutes * 60_000 : null),
    [createdAt, timeoutMinutes],
  );
  const remaining = deadline ? deadline - now : null;
  const expired = remaining !== null && remaining <= 0;
  const canUpload = currentEstado === "pendiente_pago" && !currentHasProof && !expired;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`reservation-payment-${reservaId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas", filter: `id=eq.${reservaId}` },
        (payload) => {
          const nextEstado = payload.new.estado;

          if (typeof nextEstado === "string") {
            setCurrentEstado(nextEstado as ReservaEstado);
          }

          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones", filter: `usuario_id=eq.${userId}` },
        (payload) => {
          const message = payload.new.mensaje;

          if (typeof message === "string") {
            setLastMessage(message);
          }

          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reservaId, router, userId]);

  const handleUploadSuccess = () => {
    setCurrentHasProof(true);
    router.refresh();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#d8d4c8] bg-white p-5 shadow-sm dark:border-[#314237] dark:bg-[#18251d]">
      <ActionToast
        state={state}
        successTitle="Comprobante enviado"
        errorTitle="No se pudo subir el comprobante"
        onSuccess={handleUploadSuccess}
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">Pago de la reserva</h2>
          <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Código {codigoReserva}</p>
        </div>
        <Badge variant={currentEstado === "confirmada" ? "default" : currentEstado === "cancelada" ? "destructive" : "secondary"}>
          {currentEstado === "confirmada" ? "Confirmada" : currentEstado === "cancelada" ? "Cancelada" : "Pendiente de pago"}
        </Badge>
      </div>

      {currentEstado === "confirmada" ? (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>{lastMessage || "Tu comprobante fue verificado y la reserva fue confirmada."}</p>
        </div>
      ) : null}

      {currentEstado === "cancelada" ? (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>La reserva fue cancelada. Si ya pagaste, comunícate con recepción.</p>
        </div>
      ) : null}

      {currentEstado === "pendiente_pago" && currentHasProof ? (
        <div className="flex items-start gap-3 rounded-xl bg-[#f6f1e6] p-4 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>Comprobante recibido. Recepción verificará el depósito manualmente.</p>
            {proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                Ver comprobante subido
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {currentEstado === "pendiente_pago" && !currentHasProof ? (
        <div className="space-y-4">
          {timeoutMinutes > 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Tienes <span className="font-semibold">{expired ? "0m 00s" : formatRemaining(remaining ?? 0)}</span> para subir tu comprobante.
                Si no lo subes a tiempo, la reserva puede cancelarse automáticamente.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f6f1e6] p-4 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
              La cancelación automática por comprobante está desactivada.
            </div>
          )}

          <form action={action} className="space-y-3">
            <input type="hidden" name="reservaId" value={reservaId} />
            <div className="space-y-2">
              <Label htmlFor="comprobante">Comprobante PDF o imagen</Label>
              <Input id="comprobante" name="comprobante" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={!canUpload || pending} />
              <FormMessage state={state} field="comprobante" />
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">PDF, JPG, PNG o WEBP. Máximo 10 MB.</p>
            </div>
            <Button type="submit" disabled={!canUpload || pending}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {pending ? "Subiendo..." : expired ? "Tiempo agotado" : "Subir comprobante"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
};
