"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { formValue, validationErrors } from "@/app/actions/helpers";
import type { ActionState } from "@/app/actions/types";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { authUserPhone } from "@/lib/auth/user-contact";
import { writeAuditLog } from "@/lib/db/audit";
import { emitEvent } from "@/lib/notifications/emit-event";
import { normalizePhone } from "@/lib/phone";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { staffUserSchema, type StaffUserFormValues } from "@/schemas/usuarios";

type CreateStaffUserData = {
  userId?: string;
  values?: StaffUserFormValues;
};

const authErrorMessage = (error: { message?: string } | null | undefined, fallback: string) => {
  const message = error?.message?.trim();
  return message && message !== "{}" ? message : fallback;
};

const rollbackMessage = (error: { message?: string } | null) =>
  error
    ? "No se pudo completar el registro y tampoco se pudo revertir completamente. Revisa Auth y Usuarios antes de intentarlo otra vez."
    : "No se pudo completar el registro. No se guardó ningún usuario del sistema.";

const cleanupStaffCreation = async (admin: ReturnType<typeof createSupabaseAdminClient>, userId: string) => {
  const { error: profileDeleteError } = await admin.from("usuarios").delete().eq("id", userId);
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);

  return profileDeleteError ?? authDeleteError ?? null;
};

export const createStaffUserAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<CreateStaffUserData>> => {
  const currentUser = await getCurrentUser();
  const submittedValues: StaffUserFormValues = {
    nombreCompleto: formValue(formData, "nombreCompleto"),
    email: formValue(formData, "email"),
    telefono: formValue(formData, "telefono"),
    rol: formValue(formData, "rol") as StaffUserFormValues["rol"],
  };

  if (!currentUser?.profile || currentUser.profile.rol !== "admin") {
    return {
      ok: false,
      message: "Solo un administrador puede crear usuarios del sistema.",
      data: { values: submittedValues },
    };
  }

  const parsed = staffUserSchema.safeParse({
    ...submittedValues,
    password: formValue(formData, "password"),
    passwordConfirm: formValue(formData, "passwordConfirm"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error), data: { values: submittedValues } };
  }

  const admin = createSupabaseAdminClient();
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const normalizedPhone = parsed.data.telefono ? normalizePhone(parsed.data.telefono) : "";
  const { data: authUsers, error: authListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (authListError) {
    return {
      ok: false,
      message: authErrorMessage(authListError, "No se pudo validar si la cuenta ya existe."),
      data: { values: submittedValues },
    };
  }

  const existingEmailUser = (authUsers.users ?? []).find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
  const existingPhoneUser = normalizedPhone
    ? (authUsers.users ?? []).find((user) => authUserPhone(user)?.trim() === normalizedPhone)
    : null;

  if (existingEmailUser) {
    return { ok: false, errors: { email: ["Ya existe una cuenta con ese email."] }, data: { values: submittedValues } };
  }

  if (existingPhoneUser) {
    return { ok: false, errors: { telefono: ["Ya existe una cuenta con ese teléfono."] }, data: { values: submittedValues } };
  }

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    ...(normalizedPhone ? { phone: normalizedPhone, phone_confirm: true } : {}),
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombreCompleto,
      rol: parsed.data.rol,
      ...(normalizedPhone ? { telefono: normalizedPhone } : {}),
    },
  });

  if (authError || !created.user) {
    return {
      ok: false,
      message: authErrorMessage(authError, "No se pudo crear el usuario Auth."),
      data: { values: submittedValues },
    };
  }

  const { error: profileError } = await admin
    .from("usuarios")
    .upsert(
      {
        id: created.user.id,
        nombre: parsed.data.nombreCompleto,
        rol: parsed.data.rol,
        activo: true,
        must_change_password: true,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    const rollbackError = await cleanupStaffCreation(admin, created.user.id);

    return {
      ok: false,
      message: rollbackMessage(rollbackError),
      data: { values: submittedValues },
    };
  }

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: "usuario.personal_creado",
    entidad: "usuarios",
    entidad_id: created.user.id,
    metadata: { email: normalizedEmail, rol: parsed.data.rol, telefono_normalizado: normalizedPhone || null },
  });

  await emitEvent(admin, {
    event: "usuario.personal_creado",
    title: "Usuario del sistema creado",
    message: `Se creó el usuario ${parsed.data.nombreCompleto} con rol ${parsed.data.rol}.`,
    userId: created.user.id,
    actorId: currentUser.authUserId,
    entity: "usuarios",
    entityId: created.user.id,
    payload: { user_id: created.user.id, email: normalizedEmail, rol: parsed.data.rol },
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/notificaciones");

  return {
    ok: true,
    message: "Usuario del sistema creado. Debe iniciar sesión con la contraseña temporal y cambiarla.",
    data: { userId: created.user.id },
  };
};

export const deleteUserAccountAction = async (userId: string): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "admin") {
    return { ok: false, message: "Solo un administrador puede eliminar usuarios." };
  }

  const parsedUserId = z.uuid().safeParse(userId);
  if (!parsedUserId.success) return { ok: false, message: "Usuario inválido." };
  if (parsedUserId.data === currentUser.authUserId) {
    return { ok: false, message: "No puedes eliminar tu propia cuenta." };
  }

  const admin = createSupabaseAdminClient();
  const [{ data: profile, error: profileError }, { data: guest, error: guestError }] = await Promise.all([
    admin.from("usuarios").select("id,nombre,rol").eq("id", parsedUserId.data).maybeSingle(),
    admin.from("huespedes").select("*").eq("usuario_id", parsedUserId.data).maybeSingle(),
  ]);

  if (profileError || guestError) return { ok: false, message: "No se pudo consultar el usuario." };
  if (!profile) return { ok: false, message: "El usuario no existe." };

  const [{ count: reservationCount }, { count: tariffCount }, { count: qrCount }, { count: registeredReservationCount }, { count: verifiedPaymentCount }, { count: uploadedProofCount }, { count: auditCount }] = await Promise.all([
    guest
      ? admin.from("reservas").select("id", { count: "exact", head: true }).eq("huesped_id", guest.id)
      : Promise.resolve({ count: 0 }),
    admin.from("tarifas").select("id", { count: "exact", head: true }).eq("created_by", parsedUserId.data),
    admin.from("qr_pagos").select("id", { count: "exact", head: true }).eq("created_by", parsedUserId.data),
    admin.from("reservas").select("id", { count: "exact", head: true }).eq("registrado_por", parsedUserId.data),
    admin.from("transacciones").select("id", { count: "exact", head: true }).eq("verificado_por", parsedUserId.data),
    admin.from("comprobantes").select("id", { count: "exact", head: true }).eq("uploaded_by", parsedUserId.data),
    admin.from("audit_log").select("id", { count: "exact", head: true }).eq("usuario_id", parsedUserId.data),
  ]);

  if ((reservationCount ?? 0) > 0 || (registeredReservationCount ?? 0) > 0) {
    return { ok: false, message: "No se puede eliminar: el usuario tiene reservas asociadas. Desactiva la cuenta en su lugar." };
  }

  if ((tariffCount ?? 0) > 0 || (qrCount ?? 0) > 0 || (verifiedPaymentCount ?? 0) > 0 || (uploadedProofCount ?? 0) > 0 || (auditCount ?? 0) > 0) {
    return { ok: false, message: "No se puede eliminar: el usuario tiene registros administrativos asociados. Desactiva la cuenta en su lugar." };
  }

  const { error: notificationsError } = await admin
    .from("notificaciones")
    .delete()
    .or(`usuario_id.eq.${parsedUserId.data},actor_id.eq.${parsedUserId.data}`);
  if (notificationsError) return { ok: false, message: "No se pudieron eliminar las notificaciones del usuario." };

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: "usuario.eliminado",
    entidad: "usuarios",
    entidad_id: parsedUserId.data,
    metadata: { nombre: profile.nombre, rol: profile.rol, tenia_huesped: Boolean(guest) },
  });

  if (guest) {
    const { error } = await admin.from("huespedes").delete().eq("id", guest.id);
    if (error) return { ok: false, message: `No se pudo eliminar la ficha de huésped: ${error.message}` };
  }

  const { error: profileDeleteError } = await admin.from("usuarios").delete().eq("id", parsedUserId.data);
  if (profileDeleteError) return { ok: false, message: `No se pudo eliminar el perfil interno: ${profileDeleteError.message}` };

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(parsedUserId.data);
  if (authDeleteError) return { ok: false, message: `El perfil fue eliminado, pero no se pudo eliminar Auth: ${authDeleteError.message}` };

  await emitEvent(admin, {
    event: "usuario.eliminado",
    title: "Usuario eliminado",
    message: `Se eliminó el usuario ${profile.nombre}.`,
    actorId: currentUser.authUserId,
    entity: "usuarios",
    entityId: parsedUserId.data,
    payload: { rol: profile.rol },
  });

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/notificaciones");
  return { ok: true, message: "Usuario, ficha de huésped y cuenta Auth eliminados." };
};
