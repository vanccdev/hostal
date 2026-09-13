"use client";

import { type FormEvent, useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, FileCheck2, FileText, FileUp, QrCode, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { uploadReservationProofAction } from "@/app/actions/comprobantes";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { DocumentUpload } from "@/components/forms/DocumentUpload";
import { FormMessage } from "@/components/forms/FormMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appTimestampToMs } from "@/lib/datetime";
import { formatReservaEstado } from "@/lib/reserva-estado";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EstadoVerificacionPago, ReservaEstado } from "@/types/database";

type ReservationPaymentStatusProps = {
  reservaId: string;
  codigoReserva: string;
  estado: ReservaEstado;
  createdAt: string;
  timeoutMinutes: number;
  hasProof: boolean;
  proofUrl?: string | null;
  userId: string;
  paymentVerificationStatus?: EstadoVerificacionPago | null;
  qrPayment?: { nombre: string; descripcion: string | null; url: string } | null;
};

type ReservationStatusPayload = {
  ok: boolean;
  estado?: ReservaEstado;
  hasProof?: boolean;
  proofUrl?: string | null;
  paymentVerificationStatus?: EstadoVerificacionPago | null;
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

const isPdfUrl = (url: string) => url.toLowerCase().split("?")[0].endsWith(".pdf");

const estadoBadgeVariant = (estado: ReservaEstado) => {
  if (estado === "confirmada" || estado === "checkin" || estado === "checkout") {
    return "default";
  }

  if (estado === "cancelada" || estado === "no_show") {
    return "destructive";
  }

  return "secondary";
};

const reservationStatusMessage: Record<ReservaEstado, { title: string; description: string; tone: "info" | "success" | "warning" | "danger" }> = {
  pendiente_pago: {
    title: "Pago pendiente",
    description: "Tu reserva está pendiente hasta que recepción verifique el comprobante.",
    tone: "warning",
  },
  confirmada: {
    title: "Reserva confirmada",
    description: "Tu comprobante fue verificado y la reserva está confirmada. Ya puedes cerrar esta pantalla o cerrar sesión.",
    tone: "success",
  },
  checkin: {
    title: "Check-in registrado",
    description: "Tu estadía ya figura con check-in registrado.",
    tone: "success",
  },
  checkout: {
    title: "Check-out registrado",
    description: "Tu estadía fue marcada con check-out.",
    tone: "info",
  },
  cancelada: {
    title: "Reserva cancelada",
    description: "La reserva fue cancelada. Si ya pagaste, comunícate con recepción.",
    tone: "danger",
  },
  no_show: {
    title: "No se presentó",
    description: "La reserva fue marcada como no presentada.",
    tone: "danger",
  },
};

const paymentStatusMessage: Record<EstadoVerificacionPago, string> = {
  por_verificar: "Comprobante recibido. Mantén esta pantalla abierta mientras administración verifica el pago y confirma tu reserva.",
  aprobada: "Pago aprobado.",
  rechazada: "Comprobante rechazado. Puedes subir otro comprobante válido mientras la reserva siga dentro del tiempo de espera.",
};

const statusPanelClass = {
  info: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  warning: "bg-[#f6f1e6] text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]",
  danger: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
} satisfies Record<(typeof reservationStatusMessage)[ReservaEstado]["tone"], string>;

export const ReservationPaymentStatus = ({
  reservaId,
  codigoReserva,
  estado,
  createdAt,
  timeoutMinutes,
  hasProof,
  proofUrl,
  userId,
  paymentVerificationStatus = null,
  qrPayment = null,
}: ReservationPaymentStatusProps) => {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadReservationProofAction, initialActionState);
  const [currentEstado, setCurrentEstado] = useState<ReservaEstado>(estado);
  const [currentHasProof, setCurrentHasProof] = useState(hasProof);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<EstadoVerificacionPago | null>(paymentVerificationStatus);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null | undefined>(proofUrl);
  const [lastMessage, setLastMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [clientFileError, setClientFileError] = useState("");
  const [selectedProofCount, setSelectedProofCount] = useState(0);
  const [proofUploadResetKey, setProofUploadResetKey] = useState(0);
  const currentEstadoRef = useRef(currentEstado);
  const currentPaymentStatusRef = useRef(currentPaymentStatus);
  const deadline = useMemo(
    () => (timeoutMinutes > 0 ? appTimestampToMs(createdAt) + timeoutMinutes * 60_000 : null),
    [createdAt, timeoutMinutes],
  );
  const remaining = deadline ? deadline - now : null;
  const expired = remaining !== null && remaining <= 0;
  const canUpload = currentEstado === "pendiente_pago" && !currentHasProof && !expired;
  const currentStatusInfo = reservationStatusMessage[currentEstado];

  useEffect(() => {
    currentEstadoRef.current = currentEstado;
  }, [currentEstado]);

  useEffect(() => {
    currentPaymentStatusRef.current = currentPaymentStatus;
  }, [currentPaymentStatus]);

  const applyReservationStatus = useCallback((payload: ReservationStatusPayload, notify: boolean) => {
    const nextEstado = payload.estado;
    const nextPaymentStatus = payload.paymentVerificationStatus;

    if (nextEstado && nextEstado !== currentEstadoRef.current) {
      setCurrentEstado(nextEstado);
      const statusInfo = reservationStatusMessage[nextEstado];

      if (notify) {
        if (statusInfo.tone === "danger") {
          toast.error(statusInfo.title, { description: statusInfo.description });
        } else if (statusInfo.tone === "success") {
          toast.success(statusInfo.title, { description: statusInfo.description });
        } else {
          toast(statusInfo.title, { description: statusInfo.description });
        }
      }
    }

    if (typeof payload.hasProof === "boolean") {
      setCurrentHasProof(payload.hasProof);
    }

    if ("proofUrl" in payload) {
      setCurrentProofUrl(payload.proofUrl);
    }

    if (nextPaymentStatus !== undefined && nextPaymentStatus !== currentPaymentStatusRef.current) {
      setCurrentPaymentStatus(nextPaymentStatus ?? null);

      if (notify && nextPaymentStatus) {
        if (nextPaymentStatus === "rechazada") {
          toast.error("Comprobante rechazado", { description: paymentStatusMessage.rechazada });
        } else if (nextPaymentStatus === "aprobada") {
          toast.success("Pago aprobado", { description: paymentStatusMessage.aprobada });
        } else {
          toast("Pago en revisión", { description: paymentStatusMessage.por_verificar });
        }
      }
    }
  }, []);

  const refreshReservationStatus = useCallback(async (notify: boolean) => {
    const response = await fetch(`/api/app/reservas/${reservaId}/status`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as ReservationStatusPayload;

    if (payload.ok) {
      applyReservationStatus(payload, notify);
    }
  }, [applyReservationStatus, reservaId]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const refresh = () => {
      void refreshReservationStatus(true);
    };
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`reservation-payment-${reservaId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reservas", filter: `id=eq.${reservaId}` },
        (payload) => {
          const nextEstado = payload.new.estado;

          if (typeof nextEstado === "string") {
            const typedEstado = nextEstado as ReservaEstado;
            setCurrentEstado(typedEstado);

            const statusInfo = reservationStatusMessage[typedEstado];
            if (statusInfo) {
              if (statusInfo.tone === "danger") {
                toast.error(statusInfo.title, { description: statusInfo.description });
              } else if (statusInfo.tone === "success") {
                toast.success(statusInfo.title, { description: statusInfo.description });
              } else {
                toast(statusInfo.title, { description: statusInfo.description });
              }
            }
          }

          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transacciones", filter: `reserva_id=eq.${reservaId}` },
        () => {
          refresh();
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comprobantes", filter: `reserva_id=eq.${reservaId}` },
        () => {
          refresh();
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
            toast("Actualización de tu reserva", { description: message });
          }

          router.refresh();
        },
      )
      .subscribe();
    const intervalId = window.setInterval(refresh, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    queueMicrotask(() => {
      void refreshReservationStatus(false);
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [refreshReservationStatus, reservaId, router, userId]);

  const handleUploadSuccess = () => {
    setCurrentHasProof(true);
    setCurrentPaymentStatus("por_verificar");
    void refreshReservationStatus(false);
    clearProofInput();
    router.refresh();
  };

  const clearProofInput = () => {
    setClientFileError("");
    setSelectedProofCount(0);
    setProofUploadResetKey((key) => key + 1);
  };

  const handleProofSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (selectedProofCount === 0) {
      event.preventDefault();
      setClientFileError("Selecciona un comprobante.");
    }
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
        <Badge variant={estadoBadgeVariant(currentEstado)}>{formatReservaEstado(currentEstado)}</Badge>
      </div>

      {currentEstado !== "pendiente_pago" ? (
        <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${statusPanelClass[currentStatusInfo.tone]}`}>
          {currentStatusInfo.tone === "danger" ? (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <p>{lastMessage || currentStatusInfo.description}</p>
        </div>
      ) : null}

      {currentEstado === "pendiente_pago" && currentHasProof ? (
        <div className="flex items-start gap-3 rounded-xl bg-[#f6f1e6] p-4 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
          <FileCheck2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p>
              {lastMessage ||
                (currentPaymentStatus
                  ? paymentStatusMessage[currentPaymentStatus]
                  : "Comprobante recibido. Mantén esta pantalla abierta mientras administración verifica el pago y confirma tu reserva.")}
            </p>
            {currentProofUrl ? (
              <div className="mt-3 space-y-3">
                <a href={currentProofUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
                  Ver comprobante subido
                </a>
                <div className="overflow-hidden rounded-xl border border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]">
                  {isPdfUrl(currentProofUrl) ? (
                    <div className="h-72 bg-[#f6f1e6] dark:bg-[#1d2c23]">
                      <object data={currentProofUrl} type="application/pdf" className="h-full w-full">
                        <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-[#66736a] dark:text-[#b7c0b4]">
                          <FileText className="h-8 w-8 text-[#c7a35a]" aria-hidden="true" />
                          <span>Vista previa PDF del comprobante subido.</span>
                        </div>
                      </object>
                    </div>
                  ) : (
                    <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#1d2c23]">
                      <Image
                        src={currentProofUrl}
                        alt="Comprobante subido"
                        fill
                        sizes="(min-width: 768px) 640px, 100vw"
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {currentEstado === "pendiente_pago" && !currentHasProof ? (
        <div className={qrPayment ? "grid gap-6 lg:grid-cols-2 lg:items-start" : "space-y-4"}>
          {qrPayment ? (
            <div className="rounded-2xl border border-[#c7a35a]/60 bg-[#fffaf0] p-4 dark:bg-[#242218] sm:p-5">
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
                <Image src={qrPayment.url} alt={`Código QR de pago: ${qrPayment.nombre}`} fill sizes="(min-width: 1024px) 420px, 90vw" className="object-contain p-3" unoptimized />
              </div>
              <div className="mt-4 flex items-start gap-3">
                <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-[#a9822f]" aria-hidden="true" />
                <div className="min-w-0 space-y-2">
                  <p className="font-semibold text-[#18221b] dark:text-zinc-100">Paga con QR</p>
                  <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Escanea el código desde la aplicación de tu banco y completa el pago.</p>
                  <p className="text-sm font-semibold text-[#6d5728] dark:text-[#e8d59a]">{qrPayment.nombre}</p>
                  {qrPayment.descripcion ? <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">{qrPayment.descripcion}</p> : null}
                  <p className="text-sm text-[#66736a] dark:text-[#b7c0b4]">Después, sube el comprobante generado en la columna de al lado.</p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#18221b] dark:text-zinc-100">Subir comprobante de pago</h3>
              <p className="mt-1 text-sm text-[#66736a] dark:text-[#b7c0b4]">Adjunta el comprobante que te generó la aplicación de tu banco.</p>
            </div>
            {currentPaymentStatus === "rechazada" ? (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>{lastMessage || paymentStatusMessage.rechazada}</p>
            </div>
            ) : null}
          {timeoutMinutes > 0 ? (
            <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <p>
                Tienes <span className="font-semibold">{expired ? "0m 00s" : formatRemaining(remaining ?? 0)}</span> para subir
                {currentPaymentStatus === "rechazada" ? " un nuevo comprobante" : " tu comprobante"}.
                Si no lo subes a tiempo, la reserva puede cancelarse automáticamente.
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-[#f6f1e6] p-4 text-sm text-[#6d5728] dark:bg-[#2b2618] dark:text-[#e8d59a]">
              La cancelación automática por comprobante está desactivada.
            </div>
            )}

            <form action={action} className="space-y-3" onSubmit={handleProofSubmit}>
            <input type="hidden" name="reservaId" value={reservaId} />
            <div className="space-y-2">
              <DocumentUpload
                disabled={!canUpload || pending}
                inputId="comprobante"
                inputName="comprobante"
                maxFiles={1}
                maxSizeMB={10}
                preserveInputValue
                required
                resetKey={proofUploadResetKey}
                onFilesChange={(files) => {
                  setSelectedProofCount(files.length);
                  setClientFileError("");
                }}
              />
              <FormMessage state={state} field="comprobante" />
              {clientFileError ? <p className="text-sm text-red-600">{clientFileError}</p> : null}
            </div>
            <Button type="submit" disabled={!canUpload || pending || selectedProofCount === 0}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {pending ? "Subiendo..." : expired ? "Tiempo agotado" : "Subir comprobante"}
            </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
