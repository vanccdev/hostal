"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/db/audit";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { authUserExistsByEmailOrPhone } from "@/lib/auth/user-contact";
import { isManagementRole } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { emitEvent } from "@/lib/notifications/emit-event";
import { clienteStaffSchema } from "@/schemas/clientes";
import type { ActionState } from "@/app/actions/types";
import {
  duplicatedGuestDocumentState,
  formValue,
  isGuestDocumentUniqueError,
  validationErrors,
} from "@/app/actions/helpers";

const authErrorMessage = (error: { message?: string } | null | undefined, fallback: string) => {
  const message = error?.message?.trim();
  return message && message !== "{}" ? message : fallback;
};

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
  const existingAuth = await authUserExistsByEmailOrPhone(admin, parsed.data.email, phone);

  if (existingAuth.error) {
    return { ok: false, message: authErrorMessage(existingAuth.error, "No se pudo validar si la cuenta ya existe.") };
  }

  if (existingAuth.existingEmail) {
    return { ok: false, errors: { email: ["Ya existe una cuenta con ese email."] } };
  }

  if (existingAuth.existingPhone) {
    return { ok: false, errors: { telefono: ["Ya existe una cuenta con ese número de celular o teléfono."] } };
  }

  const { data: existingGuests, error: duplicateError } = await admin
    .from("huespedes")
    .select("id")
    .eq("numero_documento", parsed.data.numeroDocumento)
    .limit(1);

  if (duplicateError) {
    return { ok: false, message: duplicateError.message };
  }

  if (existingGuests.length > 0) {
    return duplicatedGuestDocumentState();
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    phone,
    password: phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombreCompleto,
      rol: "cliente",
      telefono: phone,
    },
  });

  if (authError || !created.user) {
    return { ok: false, message: authErrorMessage(authError, "No se pudo crear el usuario Auth.") };
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
    tipo_documento: parsed.data.tipoDocumento,
    numero_documento: parsed.data.numeroDocumento,
    pais_origen: parsed.data.pais || null,
  });

  if (guestError) {
    if (isGuestDocumentUniqueError(guestError)) {
      return duplicatedGuestDocumentState();
    }

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
