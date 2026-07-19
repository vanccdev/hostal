"use client";

import { type DragEvent, type FormEvent, useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Clock, FileCheck2, FileText, FileUp, ImagePlus, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { uploadReservationProofAction } from "@/app/actions/comprobantes";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
};

type ProofPreview = {
  file: File;
  name: string;
  sizeLabel: string;
  type: string;
  url: string;
};

type ReservationStatusPayload = {
  ok: boolean;
  estado?: ReservaEstado;
  hasProof?: boolean;
  proofUrl?: string | null;
  paymentVerificationStatus?: EstadoVerificacionPago | null;
};

const allowedProofMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

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

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
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
  rechazada: "Comprobante rechazado. Contacta al hostal para regularizar la reserva.",
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
}: ReservationPaymentStatusProps) => {
  const router = useRouter();
  const [state, action, pending] = useActionState(uploadReservationProofAction, initialActionState);
  const [currentEstado, setCurrentEstado] = useState<ReservaEstado>(estado);
  const [currentHasProof, setCurrentHasProof] = useState(hasProof);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<EstadoVerificacionPago | null>(paymentVerificationStatus);
  const [currentProofUrl, setCurrentProofUrl] = useState<string | null | undefined>(proofUrl);
  const [lastMessage, setLastMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [proofPreview, setProofPreview] = useState<ProofPreview | null>(null);
  const [clientFileError, setClientFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const proofPreviewRef = useRef<ProofPreview | null>(null);
  const currentEstadoRef = useRef(currentEstado);
  const currentPaymentStatusRef = useRef(currentPaymentStatus);
  const deadline = useMemo(
    () => (timeoutMinutes > 0 ? new Date(createdAt).getTime() + timeoutMinutes * 60_000 : null),
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
    return () => {
      if (proofPreviewRef.current) {
        URL.revokeObjectURL(proofPreviewRef.current.url);
      }
    };
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

  const syncFileInput = (file: File | null) => {
    if (!fileInputRef.current) {
      return;
    }

    if (!file) {
      fileInputRef.current.value = "";
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInputRef.current.files = dataTransfer.files;
  };

  const setProofPreviewState = (nextPreview: ProofPreview | null) => {
    if (proofPreviewRef.current) {
      URL.revokeObjectURL(proofPreviewRef.current.url);
    }

    proofPreviewRef.current = nextPreview;
    setProofPreview(nextPreview);
  };

  const replaceProofSelection = (file: File | null) => {
    setClientFileError("");

    if (!file || file.size === 0) {
      syncFileInput(null);
      setProofPreviewState(null);
      return;
    }

    if (!allowedProofMimeTypes.has(file.type)) {
      syncFileInput(null);
      setProofPreviewState(null);
      setClientFileError("Sube un PDF o imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      syncFileInput(null);
      setProofPreviewState(null);
      setClientFileError("El comprobante no puede superar 10 MB.");
      return;
    }

    syncFileInput(file);
    setProofPreviewState({
      file,
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      type: file.type,
      url: URL.createObjectURL(file),
    });
  };

  const clearProofInput = () => {
    setClientFileError("");
    syncFileInput(null);
    setProofPreviewState(null);
  };

  const handleProofDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!canUpload || pending) {
      return;
    }

    replaceProofSelection(Array.from(event.dataTransfer.files)[0] ?? null);
  };

  const handleProofSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!fileInputRef.current?.files?.[0]) {
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

          <form action={action} className="space-y-3" onSubmit={handleProofSubmit}>
            <input type="hidden" name="reservaId" value={reservaId} />
            <div className="space-y-2">
              <Label htmlFor="comprobante">Comprobante PDF o imagen</Label>
              <label
                htmlFor="comprobante"
                className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
                  canUpload && !pending
                    ? "border-[#d8d4c8] bg-[#f6f1e6] hover:border-[#c7a35a] hover:bg-[#f4ecd8] dark:border-[#314237] dark:bg-[#1d2c23] dark:hover:border-[#e8d59a] dark:hover:bg-[#223229]"
                    : "cursor-not-allowed border-[#d8d4c8] bg-zinc-100 opacity-70 dark:border-[#314237] dark:bg-[#1d2c23]"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={handleProofDrop}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c7a35a] text-[#102317]">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[#18221b] dark:text-zinc-100">
                    Arrastra tu comprobante aquí o haz clic para seleccionar
                  </span>
                  <span className="block text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                    {proofPreview ? proofPreview.name : "PDF, JPG, PNG o WEBP. Máximo 10 MB."}
                  </span>
                </span>
              </label>
              <Input
                ref={fileInputRef}
                id="comprobante"
                name="comprobante"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                disabled={!canUpload}
                className="sr-only"
                onChange={(event) => replaceProofSelection(event.currentTarget.files?.[0] ?? null)}
              />
              <FormMessage state={state} field="comprobante" />
              {clientFileError ? <p className="text-sm text-red-600">{clientFileError}</p> : null}
              <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">PDF, JPG, PNG o WEBP. Máximo 10 MB.</p>
            </div>
            {proofPreview ? (
              <div className="overflow-hidden rounded-xl border border-[#d8d4c8] bg-white dark:border-[#314237] dark:bg-[#18251d]">
                <div className="flex items-center justify-between gap-3 border-b border-[#d8d4c8] px-3 py-2 dark:border-[#314237]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#18221b] dark:text-zinc-100">{proofPreview.name}</p>
                    <p className="text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">{proofPreview.sizeLabel}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={clearProofInput}
                    disabled={pending}
                    aria-label={`Quitar ${proofPreview.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                {proofPreview.type === "application/pdf" ? (
                  <div className="h-72 bg-[#f6f1e6] dark:bg-[#1d2c23]">
                    <object data={proofPreview.url} type="application/pdf" className="h-full w-full">
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-[#66736a] dark:text-[#b7c0b4]">
                        <FileText className="h-8 w-8 text-[#c7a35a]" aria-hidden="true" />
                        <span>Vista previa PDF seleccionada.</span>
                      </div>
                    </object>
                  </div>
                ) : (
                  <div className="relative aspect-[4/3] bg-[#f6f1e6] dark:bg-[#1d2c23]">
                    <Image
                      src={proofPreview.url}
                      alt={`Vista previa de ${proofPreview.name}`}
                      fill
                      sizes="(min-width: 768px) 640px, 100vw"
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            ) : null}
            <Button type="submit" disabled={!canUpload || pending || !proofPreview}>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {pending ? "Subiendo..." : expired ? "Tiempo agotado" : "Subir comprobante"}
            </Button>
          </form>
        </div>
      ) : null}
    </div>
  );
};
