"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { Check, ImagePlus, QrCode, Trash2 } from "lucide-react";
import { initialActionState } from "@/app/actions/types";
import {
  activateQrPaymentAction,
  deleteQrPaymentAction,
  uploadQrPaymentAction,
} from "@/app/actions/qr";
import { ActionToast } from "@/components/forms/ActionToast";
import { ImageUpload } from "@/components/forms/ImageUpload";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { FormMessage } from "@/components/forms/FormMessage";
import type { QrPago } from "@/types/database";

export const QrPaymentManager = ({ qrPayments }: { qrPayments: QrPago[] }) => {
  const [state, action, pending] = useActionState(
    uploadQrPaymentAction,
    initialActionState,
  );
  const [selectedFileCount, setSelectedFileCount] = useState(0);
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [clientFileError, setClientFileError] = useState("");

  const clearFile = () => {
    setSelectedFileCount(0);
    setClientFileError("");
    setUploadResetKey((key) => key + 1);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Agregar QR</CardTitle>
          <CardDescription>
            Sube la imagen que verá el cliente para pagar desde su banco.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            className="space-y-4"
            onSubmit={(event) => {
              if (selectedFileCount === 0) {
                event.preventDefault();
                setClientFileError("Selecciona o arrastra una imagen QR.");
              }
            }}
          >
            <ActionToast
              state={state}
              successTitle="QR guardado"
              errorTitle="No se pudo guardar el QR"
              onSuccess={clearFile}
            />
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                required
                minLength={2}
                maxLength={100}
                placeholder="QR Banco Unión"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                name="descripcion"
                maxLength={300}
                placeholder="Cuenta de pagos del hostal."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="imagen">Imagen QR</Label>
              <ImageUpload
                inputId="imagen"
                inputName="imagen"
                maxFiles={1}
                preserveInputValue
                required
                resetKey={uploadResetKey}
                onFilesChange={(files) => {
                  setSelectedFileCount(files.length);
                  setClientFileError("");
                }}
              />
              <FormMessage state={state} field="imagen" />
              {clientFileError ? (
                <p className="text-sm text-red-600">{clientFileError}</p>
              ) : null}
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
          <CardDescription>
            Solo el QR marcado como activo se muestra al cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {qrPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Todavía no hay imágenes QR cargadas.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {qrPayments.map((qr) => (
                <QrCard key={qr.id} qr={qr} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const QrCard = ({ qr }: { qr: QrPago }) => (
  <div
    className={`space-y-3 rounded-2xl border p-4 ${qr.activa ? "border-[#c7a35a] bg-[#fffaf0] dark:bg-[#242218]" : "border-border"}`}
  >
    <div className="relative aspect-square overflow-hidden rounded-xl border bg-white">
      <Image
        src={qr.url}
        alt={`Código QR: ${qr.nombre}`}
        fill
        sizes="(min-width: 1280px) 220px, (min-width: 640px) 40vw, 90vw"
        className="object-contain p-3"
        unoptimized
      />
    </div>
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{qr.nombre}</h3>
        {qr.activa ? (
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
            Activo
          </span>
        ) : null}
      </div>
      {qr.descripcion ? (
        <p className="mt-1 text-sm text-muted-foreground">{qr.descripcion}</p>
      ) : null}
    </div>
    <div className="flex flex-wrap gap-2">
      {!qr.activa ? (
        <form
          action={async () => {
            await activateQrPaymentAction(qr.id);
          }}
        >
          <Button type="submit" size="sm" variant="outline">
            <Check className="h-4 w-4" aria-hidden="true" />
            Activar
          </Button>
        </form>
      ) : (
        <span className="inline-flex items-center gap-2 px-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <QrCode className="h-4 w-4" aria-hidden="true" />
          Se mostrará al pagar
        </span>
      )}
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="destructive">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Eliminar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar {qr.nombre}</DialogTitle>
            <DialogDescription>
              Se eliminará el registro y el archivo del bucket qr. Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
            <form
              action={async () => {
                await deleteQrPaymentAction(qr.id);
              }}
            >
              <Button type="submit" variant="destructive">
                Eliminar QR
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
