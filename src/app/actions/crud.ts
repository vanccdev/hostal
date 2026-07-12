"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule, isManagementRole } from "@/lib/permissions";
import { habitacionSchema, huespedSchema, tarifaSchema } from "@/schemas/crud";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

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
    activa: formData.get("activa") === "on",
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

  if (selectedTarifa.habitacion_tipo !== parsed.data.tipo) {
    return { ok: false, message: "La tarifa seleccionada no corresponde al tipo de habitación." };
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

  revalidatePath("/admin/habitaciones");
  revalidatePath("/admin/tarifas");
  if (parsed.data.id) {
    revalidatePath(`/admin/habitaciones/${parsed.data.id}/editar`);
  }
  return {
    ok: true,
    message: imageFiles.length > 0 ? "Habitación guardada con imágenes." : "Habitación guardada.",
  };
};

export const upsertHuespedAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para gestionar huéspedes." };
  }

  const parsed = huespedSchema.safeParse({
    id: formValue(formData, "id") || undefined,
    nombreCompleto: formValue(formData, "nombreCompleto"),
    email: formValue(formData, "email"),
    telefono: formValue(formData, "telefono"),
    tipoDocumento: formValue(formData, "tipoDocumento"),
    numeroDocumento: formValue(formData, "numeroDocumento"),
    pais: formValue(formData, "pais"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    nombre_completo: parsed.data.nombreCompleto,
    email: parsed.data.email || null,
    telefono: parsed.data.telefono || null,
    tipo_documento: parsed.data.tipoDocumento || "Otro",
    numero_documento: parsed.data.numeroDocumento || `sd-${(parsed.data.id ?? crypto.randomUUID()).slice(0, 27)}`,
    pais_origen: parsed.data.pais || null,
  };

  const query = parsed.data.id
    ? admin.from("huespedes").update(payload).eq("id", parsed.data.id)
    : admin.from("huespedes").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/huespedes");
  if (parsed.data.id) {
    revalidatePath(`/admin/huespedes/${parsed.data.id}/editar`);
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
    vigenteDesde: formValue(formData, "vigenteDesde"),
    vigenteHasta: formValue(formData, "vigenteHasta"),
    activa: formData.get("activa") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    habitacion_tipo: parsed.data.habitacionTipo,
    temporada: parsed.data.temporada,
    precio_noche: parsed.data.precioNoche,
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

  revalidatePath("/admin/tarifas");
  if (parsed.data.id) {
    revalidatePath(`/admin/tarifas/${parsed.data.id}/editar`);
  }
  return { ok: true, message: "Tarifa guardada." };
};
