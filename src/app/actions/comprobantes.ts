"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { writeAuditLog } from "@/lib/db/audit";
import { getGuestForUser } from "@/lib/db/current-guest";
import { emitEvent } from "@/lib/notifications/emit-event";
import { isManagementRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { APP_TIME_ZONE, localISODate } from "@/lib/datetime";
import type { ActionState } from "@/app/actions/types";

const comprobanteBucket = "comprobante";
const maxComprobanteSize = 10 * 1024 * 1024;
const allowedComprobanteMimeTypes = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const sanitizeFilePart = (value: string | null | undefined) =>
  (value ?? "sin-dato")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "sin-dato";

const sanitizeFolderPart = (value: string | null | undefined) =>
  (value ?? "sin-correo")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "sin-correo";

const comprobanteCodeForReservation = (codigoReserva: string) =>
  `${sanitizeFilePart(codigoReserva).slice(0, 12)}-${crypto.randomUUID().replace(/-/g, "").slice(0, 7)}`.slice(0, 20);

const localDateTimeStamp = (date = new Date()) => {
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

  return `${value("year")}${value("month")}${value("day")}-${value("hour")}${value("minute")}${value("second")}`;
};

const nextComprobanteSequence = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  folderPath: string,
) => {
  const { data } = await admin.storage.from(comprobanteBucket).list(folderPath, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  const comprobanteCount = (data ?? []).filter((item) => item.name.startsWith("comprobante-")).length;

  return comprobanteCount + 1;
};

const comprobanteFileFromForm = (formData: FormData) => {
  const file = formData.get("comprobante");

  return file instanceof File && file.size > 0 ? file : null;
};

export const uploadReservationProofAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "cliente") {
    return { ok: false, message: "Solo el cliente puede subir el comprobante de su reserva." };
  }

  const reservaId = formData.get("reservaId");
  const file = comprobanteFileFromForm(formData);

  if (typeof reservaId !== "string" || !reservaId) {
    return { ok: false, errors: { reservaId: ["Reserva inválida."] } };
  }

  if (!file) {
    return { ok: false, errors: { comprobante: ["Selecciona un comprobante."] } };
  }

  const extension = allowedComprobanteMimeTypes.get(file.type);

  if (!extension) {
    return { ok: false, errors: { comprobante: ["Sube un PDF o imagen JPG, PNG o WEBP."] } };
  }

  if (file.size > maxComprobanteSize) {
    return { ok: false, errors: { comprobante: ["El comprobante no puede superar 10 MB."] } };
  }

  const admin = createSupabaseAdminClient();
  const guest = await getGuestForUser(currentUser.authUserId);

  if (!guest) {
    return { ok: false, message: "No existe huésped asociado a tu usuario." };
  }

  const { data: reserva, error: reservaError } = await admin
    .from("reservas")
    .select("id,codigo_reserva,huesped_id,precio_total,estado")
    .eq("id", reservaId)
    .eq("huesped_id", guest.id)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, message: reservaError?.message ?? "No se encontró la reserva." };
  }

  if (reserva.estado !== "pendiente_pago") {
    return { ok: false, message: "Solo puedes subir comprobantes de reservas pendientes de pago." };
  }

  const { data: existingProof, error: existingProofError } = await admin
    .from("comprobantes")
    .select("id")
    .eq("reserva_id", reserva.id)
    .maybeSingle();

  if (existingProofError) {
    return { ok: false, message: existingProofError.message };
  }

  if (existingProof) {
    return { ok: false, message: "Esta reserva ya tiene un comprobante cargado." };
  }

  await admin
    .from("transacciones")
    .delete()
    .eq("reserva_id", reserva.id)
    .eq("estado_verificacion", "por_verificar")
    .eq("tipo", "pago")
    .not("comprobante_url", "is", null);

  const comprobanteCode = comprobanteCodeForReservation(reserva.codigo_reserva);
  const folderPath = `${localISODate()}/${sanitizeFolderPart(currentUser.email)}`;
  const sequence = await nextComprobanteSequence(admin, folderPath);
  const fileNameBase = [
    "comprobante",
    sanitizeFilePart(currentUser.profile.nombre),
    localDateTimeStamp(),
    String(sequence),
  ].join("-");
  const objectPath = `${folderPath}/${fileNameBase}.${extension}`;
  const { error: uploadError } = await admin.storage.from(comprobanteBucket).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { data: publicUrlData } = admin.storage.from(comprobanteBucket).getPublicUrl(objectPath);
  const comprobanteUrl = publicUrlData.publicUrl;
  const { data: transaccion, error: transaccionError } = await admin
    .from("transacciones")
    .insert({
      reserva_id: reserva.id,
      monto: reserva.precio_total,
      metodo_pago: "qr_otro",
      estado_verificacion: "por_verificar",
      comprobante_url: comprobanteUrl,
      referencia_externa: comprobanteCode,
      tipo: "pago",
    })
    .select("id")
    .single();

  if (transaccionError) {
    await admin.storage.from(comprobanteBucket).remove([objectPath]);
    return { ok: false, message: transaccionError.message };
  }

  const { error: comprobanteError } = await admin.from("comprobantes").insert({
    reserva_id: reserva.id,
    transaccion_id: transaccion.id,
    numero_comprobante: comprobanteCode,
    emitido_at: new Date().toISOString(),
    pdf_url: comprobanteUrl,
    uploaded_by: currentUser.authUserId,
  });

  if (comprobanteError) {
    await admin.storage.from(comprobanteBucket).remove([objectPath]);
    await admin.from("transacciones").delete().eq("id", transaccion.id);
    return { ok: false, message: comprobanteError.message };
  }

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: "comprobante.subido",
    entidad: "comprobantes",
    entidad_id: reserva.id,
    metadata: { reserva_id: reserva.id, codigo_reserva: reserva.codigo_reserva, archivo: objectPath },
  });

  await emitEvent(admin, {
    event: "pago.registrado",
    title: "Comprobante recibido",
    message: `Comprobante recibido para la reserva ${reserva.codigo_reserva}. Revisar depósito de ${currentUser.profile.nombre}.`,
    payload: { reserva_id: reserva.id, codigo_reserva: reserva.codigo_reserva },
  });

  revalidatePath(`/app/reservas/${reserva.id}`);
  revalidatePath("/app/reservas");
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin/reserva-detalle");
  revalidatePath("/admin/verificar-comprobantes");

  return { ok: true, message: "Comprobante subido. El hostal revisará el depósito." };
};

export const verifyReservationProofAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para verificar comprobantes." };
  }

  const reservaId = formData.get("reservaId");
  const decision = formData.get("decision");

  if (typeof reservaId !== "string" || !reservaId) {
    return { ok: false, message: "Reserva inválida." };
  }

  if (decision !== "aprobar" && decision !== "rechazar") {
    return { ok: false, message: "Decisión inválida." };
  }

  const admin = createSupabaseAdminClient();
  const { data: reserva, error: reservaError } = await admin
    .from("reservas")
    .select("id,codigo_reserva,huesped_id,estado")
    .eq("id", reservaId)
    .maybeSingle();

  if (reservaError || !reserva) {
    return { ok: false, message: reservaError?.message ?? "No se encontró la reserva." };
  }

  const { data: transaccion, error: transaccionError } = await admin
    .from("transacciones")
    .select("id")
    .eq("reserva_id", reserva.id)
    .eq("estado_verificacion", "por_verificar")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (transaccionError || !transaccion) {
    return { ok: false, message: transaccionError?.message ?? "No hay comprobante pendiente de verificación." };
  }

  const approved = decision === "aprobar";
  const [{ error: updateTransaccionError }, { error: updateReservaError }] = await Promise.all([
    admin
      .from("transacciones")
      .update({
        estado_verificacion: approved ? "aprobada" : "rechazada",
        verificado_por: currentUser.authUserId,
        verificado_at: new Date().toISOString(),
      })
      .eq("id", transaccion.id),
    approved
      ? admin.from("reservas").update({ estado: "confirmada" }).eq("id", reserva.id)
      : Promise.resolve({ error: null }),
  ]);

  if (updateTransaccionError || updateReservaError) {
    return { ok: false, message: updateTransaccionError?.message ?? updateReservaError?.message };
  }

  const { data: guest } = await admin
    .from("huespedes")
    .select("usuario_id")
    .eq("id", reserva.huesped_id)
    .maybeSingle();

  await emitEvent(admin, {
    event: approved ? "pago.aprobado" : "pago.rechazado",
    title: approved ? "Reserva confirmada" : "Comprobante rechazado",
    message: approved
      ? `Tu reserva ${reserva.codigo_reserva} fue verificada y confirmada.`
      : `El comprobante de la reserva ${reserva.codigo_reserva} fue rechazado. Contacta al hostal o sube un comprobante válido.`,
    userId: guest?.usuario_id ?? null,
    payload: { reserva_id: reserva.id, codigo_reserva: reserva.codigo_reserva },
  });

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: approved ? "comprobante.aprobado" : "comprobante.rechazado",
    entidad: "reservas",
    entidad_id: reserva.id,
    metadata: { reserva_id: reserva.id, transaccion_id: transaccion.id },
  });

  revalidatePath(`/app/reservas/${reserva.id}`);
  revalidatePath("/app/reservas");
  revalidatePath("/admin/reserva-detalle");
  revalidatePath("/admin/notificaciones");
  revalidatePath("/admin/verificar-comprobantes");

  return { ok: true, message: approved ? "Reserva confirmada." : "Comprobante rechazado." };
};

export const verifyReservationProofFormAction = async (formData: FormData) => {
  await verifyReservationProofAction({ ok: false }, formData);
};
