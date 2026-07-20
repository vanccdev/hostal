"use client";

import { type DragEvent, type FormEvent, useActionState, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Banknote, FileText, FileUp, ImagePlus, X } from "lucide-react";
import {
  confirmManualReservationPaymentAction,
  uploadReservationProofByStaffAction,
} from "@/app/actions/comprobantes";
import { initialActionState } from "@/app/actions/types";
import { ActionToast } from "@/components/forms/ActionToast";
import { FormMessage } from "@/components/forms/FormMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type AdminReservationPaymentActionsProps = {
  reservaId: string;
  codigoReserva: string;
};

type ProofPreview = {
  name: string;
  sizeLabel: string;
  type: string;
  url: string;
};

const paymentMethods = [
  { value: "qr", label: "QR" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "efectivo", label: "Efectivo" },
] as const;

const allowedProofMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const AdminReservationPaymentActions = ({
  reservaId,
  codigoReserva,
}: AdminReservationPaymentActionsProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const proofPreviewRef = useRef<ProofPreview | null>(null);
  const [proofPreview, setProofPreview] = useState<ProofPreview | null>(null);
  const [clientFileError, setClientFileError] = useState("");
  const [uploadState, uploadAction, uploadPending] = useActionState(
    uploadReservationProofByStaffAction,
    initialActionState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmManualReservationPaymentAction,
    initialActionState,
  );

  const syncFileInput = useCallback((file: File | null) => {
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
  }, []);

  const setProofPreviewState = useCallback((nextPreview: ProofPreview | null) => {
    if (proofPreviewRef.current) {
      URL.revokeObjectURL(proofPreviewRef.current.url);
    }

    proofPreviewRef.current = nextPreview;
    setProofPreview(nextPreview);
  }, []);

  const clearProofInput = useCallback(() => {
    setClientFileError("");
    syncFileInput(null);
    setProofPreviewState(null);
  }, [setProofPreviewState, syncFileInput]);

  const replaceProofSelection = (file: File | null) => {
    setClientFileError("");

    if (!file || file.size === 0) {
      clearProofInput();
      return;
    }

    if (!allowedProofMimeTypes.has(file.type)) {
      clearProofInput();
      setClientFileError("Sube un PDF o imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      clearProofInput();
      setClientFileError("El comprobante no puede superar 10 MB.");
      return;
    }

    syncFileInput(file);
    setProofPreviewState({
      name: file.name,
      sizeLabel: formatFileSize(file.size),
      type: file.type,
      url: URL.createObjectURL(file),
    });
  };

  const handleProofDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (uploadPending) {
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

  useEffect(() => () => {
    if (proofPreviewRef.current) {
      URL.revokeObjectURL(proofPreviewRef.current.url);
    }
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <ActionToast
        state={uploadState}
        successTitle="Comprobante registrado"
        errorTitle="No se pudo registrar el comprobante"
        onSuccess={clearProofInput}
      />
      <ActionToast
        state={confirmState}
        successTitle="Pago confirmado"
        errorTitle="No se pudo confirmar el pago"
      />

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Subir comprobante
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir comprobante</DialogTitle>
            <DialogDescription>
              Registra el archivo recibido para {codigoReserva}. Luego quedará pendiente de verificación.
            </DialogDescription>
          </DialogHeader>
          <form action={uploadAction} className="space-y-4" onSubmit={handleProofSubmit}>
            <input type="hidden" name="reservaId" value={reservaId} />
            <div className="space-y-2">
              <Label htmlFor={`staff-method-${reservaId}`}>Método de pago</Label>
              <Select name="metodoPago" defaultValue="qr">
                <SelectTrigger id={`staff-method-${reservaId}`}>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`staff-proof-${reservaId}`}>Comprobante PDF o imagen</Label>
              <label
                htmlFor={`staff-proof-${reservaId}`}
                className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
                  uploadPending
                    ? "cursor-not-allowed border-[#d8d4c8] bg-zinc-100 opacity-70 dark:border-[#314237] dark:bg-[#1d2c23]"
                    : "border-[#d8d4c8] bg-[#f6f1e6] hover:border-[#c7a35a] hover:bg-[#f4ecd8] dark:border-[#314237] dark:bg-[#1d2c23] dark:hover:border-[#e8d59a] dark:hover:bg-[#223229]"
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
                    Arrastra el comprobante aquí o haz clic para seleccionar
                  </span>
                  <span className="block text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">
                    {proofPreview ? proofPreview.name : "PDF, JPG, PNG o WEBP. Máximo 10 MB."}
                  </span>
                </span>
              </label>
              <Input
                ref={fileInputRef}
                id={`staff-proof-${reservaId}`}
                name="comprobante"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadPending}
                onChange={(event) => replaceProofSelection(event.currentTarget.files?.[0] ?? null)}
                required
              />
              <FormMessage state={uploadState} field="comprobante" />
              {clientFileError ? <p className="text-sm text-red-600">{clientFileError}</p> : null}
              <p className="text-xs text-[#66736a] dark:text-[#b7c0b4]">
                PDF, JPG, PNG o WEBP hasta 10 MB.
              </p>
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
                    disabled={uploadPending}
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
            <DialogFooter>
              <Button type="submit" disabled={uploadPending || !proofPreview}>
                {uploadPending ? "Guardando..." : "Registrar comprobante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="sm">
            <Banknote className="h-4 w-4" aria-hidden="true" />
            Confirmar pago
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar pago sin comprobante</DialogTitle>
            <DialogDescription>
              Usa este flujo cuando recepción ya validó el pago de {codigoReserva} por caja, WhatsApp u otro canal.
            </DialogDescription>
          </DialogHeader>
          <form action={confirmAction} className="space-y-4">
            <input type="hidden" name="reservaId" value={reservaId} />
            <div className="space-y-2">
              <Label htmlFor={`manual-method-${reservaId}`}>Método de pago</Label>
              <Select name="metodoPago" defaultValue="qr">
                <SelectTrigger id={`manual-method-${reservaId}`}>
                  <SelectValue placeholder="Selecciona método" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`manual-notes-${reservaId}`}>Nota interna</Label>
              <Textarea
                id={`manual-notes-${reservaId}`}
                name="notasAdmin"
                placeholder="Ej. Pago confirmado por transferencia enviada por WhatsApp."
                maxLength={500}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={confirmPending}>
                {confirmPending ? "Confirmando..." : "Confirmar y reservar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
