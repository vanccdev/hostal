"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/db/audit";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { isManagementRole } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { emitEvent } from "@/lib/notifications/emit-event";
import { clienteStaffSchema } from "@/schemas/clientes";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

export const createClientAccountByStaff = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<{ userId: string; initialPassword: string }>> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para crear clientes." };
  }

  const parsed = clienteStaffSchema.safeParse({
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
  const phone = normalizePhone(parsed.data.telefono);

  const duplicateFilters = [
    `email.eq.${parsed.data.email}`,
    `telefono.eq.${phone}`,
    parsed.data.numeroDocumento ? `numero_documento.eq.${parsed.data.numeroDocumento}` : null,
  ].filter(Boolean);

  const { data: existingGuests, error: duplicateError } = await admin
    .from("huespedes")
    .select("id")
    .or(duplicateFilters.join(","))
    .limit(1);

  if (duplicateError) {
    return { ok: false, message: duplicateError.message };
  }

  if (existingGuests.length > 0) {
    return { ok: false, message: "Ya existe un huésped con ese email, teléfono o documento." };
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: phone,
    email_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombreCompleto,
      rol: "cliente",
    },
  });

  if (authError || !created.user) {
    return { ok: false, message: authError?.message ?? "No se pudo crear el usuario Auth." };
  }

  const { error: profileError } = await admin.from("usuarios").insert({
    id: created.user.id,
    nombre: parsed.data.nombreCompleto,
    rol: "cliente",
    activo: true,
    must_change_password: true,
  });

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: guestError } = await admin.from("huespedes").insert({
    usuario_id: created.user.id,
    nombre_completo: parsed.data.nombreCompleto,
    email: parsed.data.email,
    telefono: phone,
    tipo_documento: parsed.data.tipoDocumento || null,
    numero_documento: parsed.data.numeroDocumento || null,
    pais: parsed.data.pais || null,
  });

  if (guestError) {
    return { ok: false, message: guestError.message };
  }

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: "cliente.cuenta_creada_por_personal",
    entidad: "usuarios",
    entidad_id: created.user.id,
    metadata: { email: parsed.data.email, telefono_normalizado: phone },
  });

  await emitEvent(admin, {
    event: "cliente.cuenta_creada_por_personal",
    title: "Cuenta de cliente creada",
    message: `Se creó la cuenta para ${parsed.data.nombreCompleto}.`,
    userId: created.user.id,
    payload: { user_id: created.user.id, email: parsed.data.email },
  });

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Cuenta creada. Contraseña inicial: número de celular del cliente.",
    data: {
      userId: created.user.id,
      initialPassword: phone,
    },
  };
};

