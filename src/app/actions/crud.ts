"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule, isManagementRole } from "@/lib/permissions";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { emitEvent } from "@/lib/notifications/emit-event";
import { calculateTurnoverMinutes, getStaySettings, scheduledStayInterval, staySettingKeys } from "@/lib/stay-settings";
import {
  bloqueoSchema,
  estadoHabitacionSchema,
  habitacionSchema,
  huespedSchema,
  staySettingsSchema,
  tarifaSchema,
} from "@/schemas/crud";
import type { BloqueoInput, EstadoHabitacionInput } from "@/schemas/crud";
import type { ActionState } from "@/app/actions/types";
import {
  duplicatedGuestDocumentState,
  formValue,
  isGuestDocumentUniqueError,
  validationErrors,
} from "@/app/actions/helpers";
import { intervalsOverlap } from "@/lib/room-availability";

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

type BloqueoActionData = {
  values?: BloqueoInput;
};

type EstadoHabitacionActionData = {
  values?: EstadoHabitacionInput;
};

type ActiveReservationForBlock = {
  habitacion_id: string;
  fecha_ingreso: string;
  fecha_salida: string;
  checkin_programado_at: string | null;
  checkout_programado_at: string | null;
};

const latestCheckoutSuggestion = (reservations: ActiveReservationForBlock[]) =>
  reservations
    .map((reservation) => reservation.fecha_salida)
    .sort()
    .at(-1);

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

  await emitEvent(admin, {
    event: "habitacion.guardada",
    title: parsed.data.id ? "Habitación actualizada" : "Habitación creada",
    message: `Habitación ${parsed.data.numero} guardada por ${currentUser.profile.nombre}.`,
    actorId: currentUser.authUserId,
    entity: "habitaciones",
    entityId: habitacion.id,
    payload: { habitacion_id: habitacion.id, numero: parsed.data.numero, imagenes_subidas: imageFiles.length },
  });

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

  await emitEvent(admin, {
    event: "habitacion.imagen_eliminada",
    title: "Imagen de habitación eliminada",
    message: "Se eliminó una imagen de habitación.",
    actorId: currentUser.authUserId,
    entity: "habitaciones",
    entityId: image.habitacion_id,
    payload: { habitacion_id: image.habitacion_id, image_id: image.id },
  });

  return { ok: true, message: "Imagen eliminada." };
};

export const createBloqueoFechasAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<BloqueoActionData>> => {
  const currentUser = await getCurrentUser();
  const rawValues = {
    scope: formValue(formData, "scope"),
    habitacionIds: formData
      .getAll("habitacionIds")
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    fechaInicio: formValue(formData, "fechaInicio"),
    fechaFin: formValue(formData, "fechaFin"),
    motivo: formValue(formData, "motivo"),
  };

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "bloqueos")) {
    return { ok: false, message: "No tienes permiso para gestionar bloqueos.", data: { values: rawValues as BloqueoInput } };
  }

  const parsed = bloqueoSchema.safeParse(rawValues);

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error), data: { values: rawValues as BloqueoInput } };
  }

  const admin = createSupabaseAdminClient();
  const selectedRoomIds = [...new Set(parsed.data.habitacionIds)];

  if (parsed.data.scope !== "todas") {
    const { data: habitaciones, error: habitacionesError } = await admin
      .from("habitaciones")
      .select("id,numero")
      .in("id", selectedRoomIds);

    if (habitacionesError) {
      return { ok: false, message: habitacionesError.message, data: { values: parsed.data } };
    }

    if ((habitaciones ?? []).length !== selectedRoomIds.length) {
      return { ok: false, message: "Una o más habitaciones seleccionadas no existen.", data: { values: parsed.data } };
    }
  }

  const { data: reservedRooms, error: reservedRoomsError } = await admin
    .from("reservas")
    .select("habitacion_id")
    .in("estado", ["pendiente_pago", "confirmada", "checkin"])
    .lt("fecha_ingreso", parsed.data.fechaFin)
    .gt("fecha_salida", parsed.data.fechaInicio);

  if (reservedRoomsError) {
    return { ok: false, message: reservedRoomsError.message, data: { values: parsed.data } };
  }

  const roomIdsToValidate =
    parsed.data.scope === "todas"
      ? [...new Set((reservedRooms ?? []).map((reservation) => reservation.habitacion_id))]
      : selectedRoomIds;

  if (roomIdsToValidate.length > 0) {
    const staySettings = await getStaySettings(admin);
    const blockInterval = scheduledStayInterval(parsed.data.fechaInicio, parsed.data.fechaFin, staySettings);
    const [{ data: reservations, error: reservationsError }, { data: roomLabels, error: roomLabelsError }] = await Promise.all([
      admin
        .from("reservas")
        .select("habitacion_id,fecha_ingreso,fecha_salida,checkin_programado_at,checkout_programado_at")
        .in("habitacion_id", roomIdsToValidate)
        .in("estado", ["pendiente_pago", "confirmada", "checkin"])
        .lt("fecha_ingreso", parsed.data.fechaFin)
        .gt("fecha_salida", parsed.data.fechaInicio),
      admin.from("habitaciones").select("id,numero").in("id", roomIdsToValidate),
    ]);

    if (reservationsError) {
      return { ok: false, message: reservationsError.message, data: { values: parsed.data } };
    }

    if (roomLabelsError) {
      return { ok: false, message: roomLabelsError.message, data: { values: parsed.data } };
    }

    const roomNumberById = new Map((roomLabels ?? []).map((room) => [room.id, room.numero]));
    const overlappingReservations = ((reservations ?? []) as ActiveReservationForBlock[]).filter((reservation) => {
      const reservationInterval = {
        checkinAt:
          reservation.checkin_programado_at ??
          scheduledStayInterval(reservation.fecha_ingreso, reservation.fecha_salida, staySettings).checkinAt,
        checkoutAt:
          reservation.checkout_programado_at ??
          scheduledStayInterval(reservation.fecha_ingreso, reservation.fecha_salida, staySettings).checkoutAt,
      };

      return intervalsOverlap(
        reservationInterval.checkinAt,
        reservationInterval.checkoutAt,
        blockInterval.checkinAt,
        blockInterval.checkoutAt,
      );
    });

    if (overlappingReservations.length > 0) {
      const firstReservation = overlappingReservations[0];
      const roomLabel =
        parsed.data.scope === "todas"
          ? "Hay habitaciones ocupadas"
          : `La habitación ${roomNumberById.get(firstReservation.habitacion_id) ?? firstReservation.habitacion_id} está ocupada`;
      const suggestedStart = latestCheckoutSuggestion(overlappingReservations);

      return {
        ok: false,
        message: suggestedStart
          ? `${roomLabel} dentro del rango seleccionado. Crea el bloqueo desde ${suggestedStart}, que es la fecha de salida más cercana disponible para ese cruce.`
          : `${roomLabel} dentro del rango seleccionado. Ajusta la fecha de inicio después de la salida del huésped.`,
        data: {
          values: {
            ...parsed.data,
            fechaInicio: suggestedStart && suggestedStart < parsed.data.fechaFin ? suggestedStart : parsed.data.fechaInicio,
          },
        },
      };
    }
  }

  const baseRow = {
    fecha_inicio: parsed.data.fechaInicio,
    fecha_fin: parsed.data.fechaFin,
    motivo: parsed.data.motivo,
    creado_por: currentUser.authUserId,
  };
  const rows = selectedRoomIds.map((habitacionId) => ({
    ...baseRow,
    habitacion_id: habitacionId,
  }));
  const { error } =
    parsed.data.scope === "todas"
      ? await admin.from("bloqueos_fechas").insert(baseRow)
      : await admin.from("bloqueos_fechas").insert(rows);

  if (error) {
    return { ok: false, message: error.message, data: { values: parsed.data } };
  }

  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath("/admin");
  revalidatePath("/admin/bloqueos");
  revalidatePath("/admin/reservas/nueva");

  await emitEvent(admin, {
    event: "bloqueo_fechas.creado",
    title: parsed.data.scope === "todas" ? "Bloqueo general creado" : "Bloqueo de habitación creado",
    message:
      parsed.data.scope === "todas"
        ? `Se bloqueó todo el hostal del ${parsed.data.fechaInicio} al ${parsed.data.fechaFin}.`
        : `Se bloquearon ${rows.length} habitación(es) del ${parsed.data.fechaInicio} al ${parsed.data.fechaFin}.`,
    actorId: currentUser.authUserId,
    entity: "bloqueos_fechas",
    payload: {
      scope: parsed.data.scope,
      habitacion_ids: selectedRoomIds,
      fecha_inicio: parsed.data.fechaInicio,
      fecha_fin: parsed.data.fechaFin,
    },
  });

  return {
    ok: true,
    message:
      parsed.data.scope === "todas"
        ? "Bloqueo general creado."
        : rows.length === 1
          ? "Bloqueo creado para 1 habitación."
          : `Bloqueos creados para ${rows.length} habitaciones.`,
  };
};

export const deleteBloqueoFechasAction = async (bloqueoId: string): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "bloqueos")) {
    return { ok: false, message: "No tienes permiso para desbloquear fechas." };
  }

  const admin = createSupabaseAdminClient();
  const { data: bloqueo, error: readError } = await admin
    .from("bloqueos_fechas")
    .select("id,habitacion_id,fecha_inicio,fecha_fin,motivo")
    .eq("id", bloqueoId)
    .maybeSingle();

  if (readError || !bloqueo) {
    return { ok: false, message: readError?.message ?? "El bloqueo ya no existe." };
  }

  const { error } = await admin.from("bloqueos_fechas").delete().eq("id", bloqueo.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath("/admin");
  revalidatePath("/admin/bloqueos");
  revalidatePath("/admin/reservas/nueva");

  await emitEvent(admin, {
    event: "bloqueo_fechas.eliminado",
    title: bloqueo.habitacion_id ? "Bloqueo de habitación eliminado" : "Bloqueo general eliminado",
    message: `Se desbloqueó el rango ${bloqueo.fecha_inicio} al ${bloqueo.fecha_fin}.`,
    actorId: currentUser.authUserId,
    entity: "bloqueos_fechas",
    entityId: bloqueo.id,
    payload: {
      bloqueo_id: bloqueo.id,
      habitacion_id: bloqueo.habitacion_id,
      fecha_inicio: bloqueo.fecha_inicio,
      fecha_fin: bloqueo.fecha_fin,
    },
  });

  return { ok: true, message: "Fechas desbloqueadas." };
};

export const updateEstadoHabitacionAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<EstadoHabitacionActionData>> => {
  const currentUser = await getCurrentUser();
  const rawValues = {
    habitacionId: formValue(formData, "habitacionId"),
    estado: formValue(formData, "estado"),
    notas: formValue(formData, "notas"),
  };

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "estado-habitaciones")) {
    return { ok: false, message: "No tienes permiso para cambiar el estado de habitaciones.", data: { values: rawValues as EstadoHabitacionInput } };
  }

  const parsed = estadoHabitacionSchema.safeParse(rawValues);

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error), data: { values: rawValues as EstadoHabitacionInput } };
  }

  const admin = createSupabaseAdminClient();
  const { data: habitacion, error: habitacionError } = await admin
    .from("habitaciones")
    .select("id,numero")
    .eq("id", parsed.data.habitacionId)
    .maybeSingle();

  if (habitacionError || !habitacion) {
    return { ok: false, message: habitacionError?.message ?? "La habitación no existe.", data: { values: parsed.data } };
  }

  const { data: currentStates, error: currentStateError } = await admin
    .from("estado_habitaciones")
    .select("id,estado")
    .eq("habitacion_id", parsed.data.habitacionId)
    .order("changed_at", { ascending: false })
    .limit(1);

  if (currentStateError) {
    return { ok: false, message: currentStateError.message, data: { values: parsed.data } };
  }

  const previousState = currentStates?.[0]?.estado ?? null;
  const payload = {
    habitacion_id: parsed.data.habitacionId,
    estado: parsed.data.estado,
    cambiado_por: currentUser.authUserId,
    notas: parsed.data.notas || null,
    changed_at: new Date().toISOString(),
  };
  const existingStateId = currentStates?.[0]?.id;
  const { error } = existingStateId
    ? await admin.from("estado_habitaciones").update(payload).eq("id", existingStateId)
    : await admin.from("estado_habitaciones").insert(payload);

  if (error) {
    return { ok: false, message: error.message, data: { values: parsed.data } };
  }

  const { error: logError } = await admin.from("log_estados_habitacion").insert({
    habitacion_id: parsed.data.habitacionId,
    estado_anterior: previousState,
    estado_nuevo: parsed.data.estado,
    cambiado_por: currentUser.authUserId,
  });

  if (logError) {
    return { ok: false, message: logError.message, data: { values: parsed.data } };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/estado-habitaciones");

  await emitEvent(admin, {
    event: "habitacion.estado_actualizado",
    title: "Estado de habitación actualizado",
    message: `Habitación ${habitacion.numero} marcada como ${parsed.data.estado}.`,
    actorId: currentUser.authUserId,
    entity: "estado_habitaciones",
    entityId: existingStateId,
    payload: {
      habitacion_id: parsed.data.habitacionId,
      estado_anterior: previousState,
      estado_nuevo: parsed.data.estado,
    },
  });

  return { ok: true, message: "Estado actualizado." };
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

  await emitEvent(admin, {
    event: "huesped.actualizado",
    title: "Ficha de huésped actualizada",
    message: `Se actualizó el documento ${parsed.data.tipoDocumento} ${parsed.data.numeroDocumento}.`,
    actorId: currentUser.authUserId,
    entity: "huespedes",
    entityId: parsed.data.id,
    payload: { huesped_id: parsed.data.id },
  });

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
    ? admin.from("tarifas").update(payload).eq("id", parsed.data.id).select("id").single()
    : admin.from("tarifas").insert(payload).select("id").single();
  const { data: tarifa, error } = await query;

  if (error || !tarifa) {
    return { ok: false, message: error?.message ?? "No se pudo guardar la tarifa." };
  }

  await emitEvent(admin, {
    event: "tarifa.guardada",
    title: parsed.data.id ? "Tarifa actualizada" : "Tarifa creada",
    message: `Tarifa ${parsed.data.habitacionTipo} ${parsed.data.temporada} guardada.`,
    actorId: currentUser.authUserId,
    entity: "tarifas",
    entityId: tarifa.id,
    payload: { tarifa_id: tarifa.id, habitacion_tipo: parsed.data.habitacionTipo, temporada: parsed.data.temporada },
  });

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
    cancellationRefundHours: formValue(formData, "cancellationRefundHours"),
    cancellationRetentionPercent: formValue(formData, "cancellationRetentionPercent"),
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
    {
      clave: staySettingKeys.cancellationRefundHours,
      valor: String(parsed.data.cancellationRefundHours),
      descripcion: "Horas antes del check-in programado hasta las que una cancelación de huésped aplica a reembolso total.",
    },
    {
      clave: staySettingKeys.cancellationRetentionPercent,
      valor: String(parsed.data.cancellationRetentionPercent),
      descripcion: "Porcentaje retenido del monto pagado cuando la cancelación ocurre después del corte de reembolso total.",
    },
  ];

  const { error } = await admin
    .from("configuracion_hostal")
    .upsert(rows, { onConflict: "clave" });

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/configuracion");
  revalidatePath("/");
  revalidatePath("/app");
  revalidatePath("/app/reservas/nueva");
  revalidatePath("/admin/reservas/nueva");

  await emitEvent(admin, {
    event: "sistema.configuracion_actualizada",
    title: "Configuración actualizada",
    message: "Se actualizó la configuración operativa de estadía y comprobantes.",
    actorId: currentUser.authUserId,
    entity: "configuracion_hostal",
    payload: {
      checkin_time: parsed.data.checkinTime,
      checkout_time: parsed.data.checkoutTime,
      payment_proof_timeout_minutes: parsed.data.paymentProofTimeoutMinutes,
      cancellation_refund_hours: parsed.data.cancellationRefundHours,
      cancellation_retention_percent: parsed.data.cancellationRetentionPercent,
    },
  });

  return { ok: true, message: "Configuración de estadía guardada." };
};
