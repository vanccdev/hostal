"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule, isManagementRole } from "@/lib/permissions";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { calculateTurnoverMinutes, staySettingKeys } from "@/lib/stay-settings";
import { habitacionSchema, huespedSchema, staySettingsSchema, tarifaSchema } from "@/schemas/crud";
import type { ActionState } from "@/app/actions/types";
import {
  duplicatedGuestDocumentState,
  formValue,
  isGuestDocumentUniqueError,
  validationErrors,
} from "@/app/actions/helpers";

const ROOM_IMAGES_BUCKET = "habitaciones";
const MAX_ROOM_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ROOM_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const extensionByMimeType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const slugifyFilename = (filename: string) =>
  filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

const roomImageFilesFromFormData = (formData: FormData) =>
  formData
    .getAll("imagenes")
    .filter((value): value is File => value instanceof File && value.size > 0);

const roomImageObjectPathFromPublicUrl = (url: string) => {
  const marker = `/storage/v1/object/public/${ROOM_IMAGES_BUCKET}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const rawPath = url.slice(markerIndex + marker.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
};

const validateRoomImageFiles = (files: File[]) => {
  for (const file of files) {
    if (!ALLOWED_ROOM_IMAGE_TYPES.has(file.type)) {
      return "Solo se permiten imágenes JPG, PNG, WEBP o GIF.";
    }

    if (file.size > MAX_ROOM_IMAGE_BYTES) {
      return "Cada imagen debe pesar 5 MB o menos.";
    }
  }

  return null;
};

const uploadRoomImages = async (
  admin: ReturnType<typeof createSupabaseAdminClient>,
  habitacionId: string,
  files: File[],
) => {
  const rows: { habitacion_id: string; url: string }[] = [];
  const uploadedPaths: string[] = [];

  for (const [index, file] of files.entries()) {
    const safeName = slugifyFilename(file.name);
    const fallbackName = `imagen-${index + 1}.${extensionByMimeType[file.type] ?? "jpg"}`;
    const objectPath = `${habitacionId}/${Date.now()}-${index + 1}-${safeName || fallbackName}`;

    const { error: uploadError } = await admin.storage.from(ROOM_IMAGES_BUCKET).upload(objectPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await admin.storage.from(ROOM_IMAGES_BUCKET).remove(uploadedPaths);
      }

      return { error: uploadError.message, rows: [], uploadedPaths: [] };
    }

    uploadedPaths.push(objectPath);
    const { data } = admin.storage.from(ROOM_IMAGES_BUCKET).getPublicUrl(objectPath);
    rows.push({ habitacion_id: habitacionId, url: data.publicUrl });
  }

  return { error: null, rows, uploadedPaths };
};

export const upsertHabitacionAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar habitaciones." };
  }

  const parsed = habitacionSchema.safeParse({
    id: formValue(formData, "id") || undefined,
    tarifaId: formValue(formData, "tarifaId"),
    numero: formValue(formData, "numero"),
    tipo: formValue(formData, "tipo"),
    piso: formValue(formData, "piso"),
    capacidadMax: formValue(formData, "capacidadMax"),
    descripcion: formValue(formData, "descripcion"),
    activa: formData.get("activa") === "true",
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const imageFiles = roomImageFilesFromFormData(formData);
  const imageValidationMessage = validateRoomImageFiles(imageFiles);

  if (imageValidationMessage) {
    return { ok: false, message: imageValidationMessage };
  }

  const admin = createSupabaseAdminClient();
  const { data: selectedTarifa, error: selectedTarifaError } = await admin
    .from("tarifas")
    .select("id,habitacion_tipo,activa")
    .eq("id", parsed.data.tarifaId)
    .maybeSingle();

  if (selectedTarifaError || !selectedTarifa) {
    return { ok: false, message: selectedTarifaError?.message ?? "Selecciona una tarifa válida." };
  }

  if (selectedTarifa.activa === false) {
    return { ok: false, message: "La tarifa seleccionada no está activa." };
  }

  const payload = {
    numero: parsed.data.numero,
    tipo: parsed.data.tipo,
    tarifa_id: parsed.data.tarifaId,
    piso: parsed.data.piso,
    capacidad_max: parsed.data.capacidadMax,
    descripcion: parsed.data.descripcion || null,
    activa: parsed.data.activa,
  };

  const query = parsed.data.id
    ? admin.from("habitaciones").update(payload).eq("id", parsed.data.id).select("id").single()
    : admin.from("habitaciones").insert(payload).select("id").single();
  const { data: habitacion, error } = await query;

  if (error || !habitacion) {
    return { ok: false, message: error?.message ?? "No se pudo guardar la habitación." };
  }

  if (imageFiles.length > 0) {
    const uploadedImages = await uploadRoomImages(admin, habitacion.id, imageFiles);

    if (uploadedImages.error) {
      return { ok: false, message: uploadedImages.error };
    }

    const { error: imagesError } = await admin.from("img_habitaciones").insert(uploadedImages.rows);

    if (imagesError) {
      await admin.storage.from(ROOM_IMAGES_BUCKET).remove(uploadedImages.uploadedPaths);
      return { ok: false, message: imagesError.message };
    }
  }

  return {
    ok: true,
    message: imageFiles.length > 0 ? "Habitación guardada con imágenes." : "Habitación guardada.",
  };
};

export const deleteHabitacionImageAction = async (imageId: string): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para eliminar imágenes de habitaciones." };
  }

  const admin = createSupabaseAdminClient();
  const { data: image, error: imageError } = await admin
    .from("img_habitaciones")
    .select("id,habitacion_id,url")
    .eq("id", imageId)
    .maybeSingle();

  if (imageError || !image) {
    return { ok: false, message: imageError?.message ?? "La imagen ya no existe." };
  }

  const objectPath = roomImageObjectPathFromPublicUrl(image.url);

  if (objectPath) {
    const { error: storageError } = await admin.storage.from(ROOM_IMAGES_BUCKET).remove([objectPath]);

    if (storageError) {
      return { ok: false, message: storageError.message };
    }
  }

  const { error: deleteError } = await admin.from("img_habitaciones").delete().eq("id", image.id);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  revalidatePath("/admin/habitaciones");
  revalidatePath(`/admin/habitaciones/${image.habitacion_id}/editar`);

  return { ok: true, message: "Imagen eliminada." };
};

export const upsertHuespedAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar huéspedes." };
  }

  const parsed = huespedSchema.safeParse({
    id: formValue(formData, "id"),
    tipoDocumento: formValue(formData, "tipoDocumento"),
    numeroDocumento: formValue(formData, "numeroDocumento"),
    fechaNacimiento: formValue(formData, "fechaNacimiento"),
    pais: formValue(formData, "pais"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();

  const { data: duplicateGuest, error: duplicateGuestError } = await admin
    .from("huespedes")
    .select("id")
    .eq("numero_documento", parsed.data.numeroDocumento)
    .neq("id", parsed.data.id)
    .limit(1);

  if (duplicateGuestError) {
    return { ok: false, message: duplicateGuestError.message };
  }

  if (duplicateGuest.length > 0) {
    return duplicatedGuestDocumentState();
  }

  const payload = {
    tipo_documento: parsed.data.tipoDocumento,
    numero_documento: parsed.data.numeroDocumento,
    fecha_nacimiento: parsed.data.fechaNacimiento || null,
    pais_origen: parsed.data.pais || null,
  };

  const { error } = await admin.from("huespedes").update(payload).eq("id", parsed.data.id);

  if (error) {
    if (isGuestDocumentUniqueError(error)) {
      return duplicatedGuestDocumentState();
    }

    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Huésped guardado." };
};

export const upsertTarifaAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "tarifas")) {
    return { ok: false, message: "Solo admin puede gestionar tarifas." };
  }

  const parsed = tarifaSchema.safeParse({
    id: formValue(formData, "id") || undefined,
    habitacionTipo: formValue(formData, "habitacionTipo"),
    temporada: formValue(formData, "temporada"),
    precioNoche: formValue(formData, "precioNoche"),
    peso: formValue(formData, "peso"),
    vigenteDesde: formValue(formData, "vigenteDesde"),
    vigenteHasta: formValue(formData, "vigenteHasta"),
    activa: formData.get("activa") === "true",
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();

  if (parsed.data.activa) {
    let duplicateQuery = admin
      .from("tarifas")
      .select("id")
      .eq("habitacion_tipo", parsed.data.habitacionTipo)
      .eq("temporada", parsed.data.temporada)
      .eq("peso", parsed.data.peso)
      .eq("activa", true)
      .limit(1);

    if (parsed.data.id) {
      duplicateQuery = duplicateQuery.neq("id", parsed.data.id);
    }

    const { data: duplicateTarifa, error: duplicateTarifaError } = await duplicateQuery.maybeSingle();

    if (duplicateTarifaError) {
      return { ok: false, message: duplicateTarifaError.message };
    }

    if (duplicateTarifa) {
      return {
        ok: false,
        message:
          "Ya existe una tarifa activa con el mismo tipo de habitación, temporada y peso. Cambia el peso para definir cuál debe ganar.",
      };
    }
  }

  const payload = {
    habitacion_tipo: parsed.data.habitacionTipo,
    temporada: parsed.data.temporada,
    precio_noche: parsed.data.precioNoche,
    peso: parsed.data.peso,
    vigente_desde: parsed.data.vigenteDesde,
    vigente_hasta: parsed.data.vigenteHasta || null,
    activa: parsed.data.activa,
    created_by: currentUser.authUserId,
  };

  const query = parsed.data.id
    ? admin.from("tarifas").update(payload).eq("id", parsed.data.id)
    : admin.from("tarifas").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Tarifa guardada." };
};

export const updateStaySettingsAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "configuracion")) {
    return { ok: false, message: "Solo admin puede gestionar la configuración." };
  }

  const parsed = staySettingsSchema.safeParse({
    checkinTime: formValue(formData, "checkinTime"),
    checkoutTime: formValue(formData, "checkoutTime"),
    paymentProofTimeoutMinutes: formValue(formData, "paymentProofTimeoutMinutes"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const rows = [
    {
      clave: staySettingKeys.checkinTime,
      valor: parsed.data.checkinTime,
      descripcion: "Hora estándar desde la que el huésped puede ocupar la habitación.",
    },
    {
      clave: staySettingKeys.checkoutTime,
      valor: parsed.data.checkoutTime,
      descripcion: "Hora límite en la que el huésped debe desocupar la habitación.",
    },
    {
      clave: staySettingKeys.turnoverMinutes,
      valor: String(calculateTurnoverMinutes(parsed.data.checkoutTime, parsed.data.checkinTime)),
      descripcion: "Minutos calculados automáticamente entre check-out y nuevo check-in para limpieza/preparación.",
    },
    {
      clave: staySettingKeys.timezone,
      valor: APP_TIME_ZONE,
      descripcion: "Zona horaria operativa fija para Bolivia.",
    },
    {
      clave: staySettingKeys.paymentProofTimeoutMinutes,
      valor: String(parsed.data.paymentProofTimeoutMinutes),
      descripcion: "Minutos de espera para recibir comprobante antes de cancelar automáticamente una reserva pendiente de pago. Usa 0 para desactivar.",
    },
  ];

  const { error } = await admin
    .from("configuracion_hostal")
    .upsert(rows, { onConflict: "clave" });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/configuracion");

  return { ok: true, message: "Configuración de estadía guardada." };
};
