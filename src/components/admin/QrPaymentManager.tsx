"use client";

import Image from "next/image";
import { type DragEvent, useActionState, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, QrCode, Trash2 } from "lucide-react";
import { initialActionState } from "@/app/actions/types";
import { activateQrPaymentAction, deleteQrPaymentAction, uploadQrPaymentAction } from "@/app/actions/qr";
import { ActionToast } from "@/components/forms/ActionToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/forms/FormMessage";
import type { QrPago } from "@/types/database";

export const QrPaymentManager = ({ qrPayments }: { qrPayments: QrPago[] }) => {
  const [state, action, pending] = useActionState(uploadQrPaymentAction, initialActionState);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [clientFileError, setClientFileError] = useState("");

  useEffect(() => () => {
    if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
  }, [selectedPreviewUrl]);

  const replaceFile = (file: File | null) => {
    setClientFileError("");

    if (!file) {
      setSelectedFileName("");
      setSelectedPreviewUrl(null);
      return;
    }

    if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(file.type)) {
      setClientFileError("Solo se permiten imágenes JPG, PNG, WEBP o GIF.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setClientFileError("La imagen QR no puede superar 5 MB.");
      return;
    }

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dataTransfer.files;
    setSelectedFileName(file.name);
    setSelectedPreviewUrl(URL.createObjectURL(file));
  };

  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    replaceFile(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    replaceFile(event.dataTransfer.files[0] ?? null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agregar QR</CardTitle>
          <CardDescription>Sube la imagen que verá el cliente para pagar desde su banco.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            className="space-y-4"
            onSubmit={(event) => {
              if (!fileInputRef.current?.files?.[0]) {
                event.preventDefault();
                setClientFileError("Selecciona o arrastra una imagen QR.");
              }
            }}
          >
            <ActionToast state={state} successTitle="QR guardado" errorTitle="No se pudo guardar el QR" onSuccess={clearFile} />
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" name="nombre" required minLength={2} maxLength={100} placeholder="QR Banco Unión" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea id="descripcion" name="descripcion" maxLength={300} placeholder="Cuenta de pagos del hostal." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen QR</Label>
              <div
                className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors ${
                  dragActive
                    ? "border-[#c7a35a] bg-[#f4ecd8] dark:border-[#e8d59a] dark:bg-[#2b2618]"
                    : "border-[#d8d4c8] bg-[#f6f1e6] hover:border-[#c7a35a] hover:bg-[#f4ecd8] dark:border-[#314237] dark:bg-[#1d2c23] dark:hover:border-[#e8d59a] dark:hover:bg-[#223229]"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                }}
              >
                {selectedPreviewUrl ? (
                  <div className="relative h-28 w-28 overflow-hidden rounded-xl border bg-white">
                    <Image src={selectedPreviewUrl} alt={`Vista previa de ${selectedFileName}`} fill sizes="112px" className="object-contain p-2" unoptimized />
                  </div>
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#c7a35a] text-[#102317]"><ImagePlus className="h-5 w-5" aria-hidden="true" /></span>
                )}
                <span className="space-y-1">
                  <span className="block text-sm font-semibold text-[#18221b] dark:text-zinc-100">
                    {selectedFileName || "Arrastra la imagen QR aquí o haz clic para seleccionar"}
                  </span>
                  <span className="block text-xs font-medium text-[#66736a] dark:text-[#b7c0b4]">JPG, PNG, WEBP o GIF. Máximo 5 MB.</span>
                </span>
              </div>
              <Input
                ref={fileInputRef}
                id="imagen"
                name="imagen"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                className="sr-only"
                onChange={(event) => replaceFile(event.currentTarget.files?.[0] ?? null)}
              />
              <FormMessage state={state} field="imagen" />
              {clientFileError ? <p className="text-sm text-red-600">{clientFileError}</p> : null}
              <p className="text-xs text-muted-foreground">JPG, PNG, WEBP o GIF. Máximo 5 MB.</p>
            </div>
            <Button type="submit" disabled={pending}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {pending ? "Guardando..." : "Guardar QR"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR disponibles</CardTitle>
          <CardDescription>Solo el QR marcado como activo se muestra al cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          {qrPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Todavía no hay imágenes QR cargadas.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {qrPayments.map((qr) => <QrCard key={qr.id} qr={qr} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const QrCard = ({ qr }: { qr: QrPago }) => (
  <div className={`space-y-3 rounded-2xl border p-4 ${qr.activa ? "border-[#c7a35a] bg-[#fffaf0] dark:bg-[#242218]" : "border-border"}`}>
    <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
      <Image src={qr.url} alt={`Código QR: ${qr.nombre}`} fill sizes="(min-width: 1280px) 220px, (min-width: 640px) 40vw, 90vw" className="object-contain p-3" unoptimized />
    </div>
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{qr.nombre}</h3>
        {qr.activa ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Activo</span> : null}
      </div>
      {qr.descripcion ? <p className="mt-1 text-sm text-muted-foreground">{qr.descripcion}</p> : null}
    </div>
    <div className="flex flex-wrap gap-2">
      {!qr.activa ? (
        <form action={async () => { await activateQrPaymentAction(qr.id); }}>
          <Button type="submit" size="sm" variant="outline"><Check className="h-4 w-4" aria-hidden="true" />Activar</Button>
        </form>
      ) : (
        <span className="inline-flex items-center gap-2 px-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><QrCode className="h-4 w-4" aria-hidden="true" />Se mostrará al pagar</span>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive"><Trash2 className="h-4 w-4" aria-hidden="true" />Eliminar</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {qr.nombre}</DialogTitle>
            <DialogDescription>Se eliminará el registro y el archivo del bucket qr. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline">Cancelar</Button>
            <form action={async () => { await deleteQrPaymentAction(qr.id); }}><Button type="submit" variant="destructive">Eliminar QR</Button></form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
