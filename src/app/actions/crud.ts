"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { canAccessAdminModule, isManagementRole } from "@/lib/permissions";
import { habitacionSchema, huespedSchema, tarifaSchema } from "@/schemas/crud";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

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
    nombre: formValue(formData, "nombre"),
    numero: formValue(formData, "numero"),
    tipo: formValue(formData, "tipo"),
    capacidad: formValue(formData, "capacidad"),
    precioBase: formValue(formData, "precioBase"),
    estado: formValue(formData, "estado") || "disponible",
    descripcion: formValue(formData, "descripcion"),
    activa: formData.get("activa") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    nombre: parsed.data.nombre || parsed.data.numero,
    numero: parsed.data.numero,
    tipo: parsed.data.tipo || null,
    capacidad: parsed.data.capacidad,
    precio_base: parsed.data.precioBase,
    estado: parsed.data.estado,
    descripcion: parsed.data.descripcion || null,
    activa: parsed.data.activa,
  };

  const query = parsed.data.id
    ? admin.from("habitaciones").update(payload).eq("id", parsed.data.id)
    : admin.from("habitaciones").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/habitaciones");
  return { ok: true, message: "Habitación guardada." };
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
    tipo_documento: parsed.data.tipoDocumento || null,
    numero_documento: parsed.data.numeroDocumento || null,
    pais: parsed.data.pais || null,
  };

  const query = parsed.data.id
    ? admin.from("huespedes").update(payload).eq("id", parsed.data.id)
    : admin.from("huespedes").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/huespedes");
  return { ok: true, message: "Huésped guardado." };
};

export const upsertTarifaAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !canAccessAdminModule(currentUser.profile.rol, "tarifas")) {
    return { ok: false, message: "Solo admin puede gestionar tarifas." };
  }

  const parsed = tarifaSchema.safeParse({
    id: formValue(formData, "id") || undefined,
    nombre: formValue(formData, "nombre"),
    precioNoche: formValue(formData, "precioNoche"),
    activa: formData.get("activa") === "on",
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const payload = {
    nombre: parsed.data.nombre,
    precio_noche: parsed.data.precioNoche,
    activa: parsed.data.activa,
  };

  const query = parsed.data.id
    ? admin.from("tarifas").update(payload).eq("id", parsed.data.id)
    : admin.from("tarifas").insert(payload);
  const { error } = await query;

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/tarifas");
  return { ok: true, message: "Tarifa guardada." };
};

