"use client";

import { useTransition } from "react";
import { UserRound } from "lucide-react";
import { markNotificationReadAction } from "@/app/actions/notificaciones";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { UserRole } from "@/types/database";

export type UserNotificationDetail = {
  usuario: {
    id: string;
    nombre: string;
    rol: UserRole;
    activo: boolean | null;
    must_change_password: boolean;
    created_at: string | null;
  } | null;
  auth: {
    email: string | null;
    telefono: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
  } | null;
  huesped: {
    tipo_documento: string | null;
    numero_documento: string | null;
    pais_origen: string | null;
    fecha_nacimiento: string | null;
    observaciones: string | null;
  } | null;
};

type UserNotificationDetailDialogProps = {
  detail: UserNotificationDetail;
  notificationId: string;
  unread: boolean;
};

const valueOrDash = (value: string | boolean | null | undefined) => {
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }

  return value?.trim() ? value : "-";
};

const DetailRow = ({ label, value }: { label: string; value: string | boolean | null | undefined }) => (
  <div className="rounded-lg border border-[#d8d4c8] bg-[#fffdf7] p-3 dark:border-[#314237] dark:bg-[#101a14]">
    <p className="text-xs font-semibold uppercase text-[#66736a] dark:text-[#b7c0b4]">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-[#18221b] dark:text-zinc-100">{valueOrDash(value)}</p>
  </div>
);

export const UserNotificationDetailDialog = ({
  detail,
  notificationId,
  unread,
}: UserNotificationDetailDialogProps) => {
  const [, startTransition] = useTransition();
  const usuario = detail.usuario;
  const auth = detail.auth;
  const huesped = detail.huesped;
  const markAsRead = () => {
    if (!unread) {
      return;
    }

    const formData = new FormData();
    formData.set("notificationId", notificationId);
    startTransition(() => {
      void markNotificationReadAction(formData);
    });
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          markAsRead();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size="sm">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          Ver detalle
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Detalle del cliente</DialogTitle>
          <DialogDescription>Datos actuales registrados para esta cuenta.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow label="Nombre" value={usuario?.nombre} />
            <DetailRow label="Rol" value={usuario?.rol} />
            <DetailRow label="Estado" value={usuario?.activo === false ? "Inactivo" : "Activo"} />
            <DetailRow label="Debe cambiar contraseña" value={usuario?.must_change_password} />
            <DetailRow label="Email" value={auth?.email} />
            <DetailRow label="Teléfono" value={auth?.telefono} />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#18221b] dark:text-zinc-100">Ficha documental</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Tipo documento" value={huesped?.tipo_documento} />
              <DetailRow label="Número documento" value={huesped?.numero_documento} />
              <DetailRow label="País" value={huesped?.pais_origen} />
              <DetailRow label="Fecha nacimiento" value={huesped?.fecha_nacimiento} />
            </div>
            <DetailRow label="Observaciones" value={huesped?.observaciones} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
