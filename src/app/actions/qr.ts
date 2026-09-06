"use server";

import { revalidatePath } from "next/cache";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { emitEvent } from "@/lib/notifications/emit-event";
import { isManagementRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { QR_PAYMENT_BUCKET } from "@/lib/qr-payments";
import type { ActionState } from "@/app/actions/types";

const maxQrImageSize = 5 * 1024 * 1024;
const allowedQrMimeTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const formText = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const slugifyQrName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "qr-pago";

const qrDateSuffix = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}-${value("hour")}-${value("minute")}-${value("second")}-${String(date.getMilliseconds()).padStart(3, "0")}`;
};

const revalidateQrPaths = () => {
  revalidatePath("/admin/qr");
  revalidatePath("/app");
  revalidatePath("/app/reservas");
};

export const uploadQrPaymentAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar los QR de pago." };
  }

  const file = formData.get("imagen");
  const nombre = formText(formData, "nombre");
  const descripcion = formText(formData, "descripcion");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: { imagen: ["Selecciona una imagen QR."] } };
  }

  if (!allowedQrMimeTypes.has(file.type)) {
    return { ok: false, errors: { imagen: ["Solo se permiten imágenes JPG, PNG, WEBP o GIF."] } };
  }

  if (file.size > maxQrImageSize) {
    return { ok: false, errors: { imagen: ["La imagen QR no puede superar 5 MB."] } };
  }

  if (nombre.length < 2 || nombre.length > 100) {
    return { ok: false, errors: { nombre: ["El nombre debe tener entre 2 y 100 caracteres."] } };
  }

  const admin = createSupabaseAdminClient();
  const { count, error: countError } = await admin
    .from("qr_pagos")
    .select("id", { count: "exact", head: true })
    .eq("activa", true);

  if (countError) {
    return { ok: false, message: countError.message };
  }

  const extension = allowedQrMimeTypes.get(file.type) ?? "png";
  const storagePath = `pagos/${slugifyQrName(nombre)}-${qrDateSuffix()}.${extension}`;
  const { error: uploadError } = await admin.storage.from(QR_PAYMENT_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { data: publicUrlData } = admin.storage.from(QR_PAYMENT_BUCKET).getPublicUrl(storagePath);
  const { error: insertError } = await admin.from("qr_pagos").insert({
    nombre,
    descripcion: descripcion || null,
    url: publicUrlData.publicUrl,
    storage_path: storagePath,
    activa: count === 0,
    created_by: currentUser.authUserId,
  });

  if (insertError) {
    await admin.storage.from(QR_PAYMENT_BUCKET).remove([storagePath]);
    return { ok: false, message: insertError.message };
  }

  revalidateQrPaths();
  await emitEvent(admin, {
    event: "sistema.configuracion_actualizada",
    title: "QR de pago agregado",
    message: `Se agregó el QR de pago ${nombre}.`,
    actorId: currentUser.authUserId,
    entity: "qr_pagos",
    payload: { nombre, activa: count === 0 },
  });

  return { ok: true, message: count === 0 ? "QR agregado y activado." : "QR agregado. Actívalo cuando quieras usarlo." };
};

export const activateQrPaymentAction = async (qrId: string): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar los QR de pago." };
  }

  const admin = createSupabaseAdminClient();
  const { error: deactivateError } = await admin.from("qr_pagos").update({ activa: false }).eq("activa", true);

  if (deactivateError) {
    return { ok: false, message: deactivateError.message };
  }

  const { error } = await admin.from("qr_pagos").update({ activa: true }).eq("id", qrId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidateQrPaths();
  return { ok: true, message: "QR activo actualizado." };
};

export const deleteQrPaymentAction = async (qrId: string): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar los QR de pago." };
  }

  const admin = createSupabaseAdminClient();
  const { data: qr, error: qrError } = await admin.from("qr_pagos").select("id,storage_path,nombre").eq("id", qrId).maybeSingle();

  if (qrError || !qr) {
    return { ok: false, message: qrError?.message ?? "El QR ya no existe." };
  }

  const { error: storageError } = await admin.storage.from(QR_PAYMENT_BUCKET).remove([qr.storage_path]);

  if (storageError) {
    return { ok: false, message: storageError.message };
  }

  const { error: deleteError } = await admin.from("qr_pagos").delete().eq("id", qr.id);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  revalidateQrPaths();
  return { ok: true, message: `QR ${qr.nombre} eliminado.` };
};
