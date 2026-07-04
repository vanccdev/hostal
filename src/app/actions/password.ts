"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/db/audit";
import { emitEvent } from "@/lib/notifications/emit-event";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { isManagementRole } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { resetClientPasswordSchema } from "@/schemas/clientes";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

export const resetClientPasswordToPhone = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para restablecer contraseñas." };
  }

  const parsed = resetClientPasswordSchema.safeParse({
    userId: formValue(formData, "userId"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("usuarios")
    .select("id,rol")
    .eq("id", parsed.data.userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, message: profileError?.message ?? "Usuario no encontrado." };
  }

  if (profile.rol !== "cliente") {
    return { ok: false, message: "Solo se puede restablecer contraseña a clientes." };
  }

  const { data: guest, error: guestError } = await admin
    .from("huespedes")
    .select("telefono,email")
    .eq("usuario_id", parsed.data.userId)
    .maybeSingle();

  if (guestError || !guest?.telefono) {
    return { ok: false, message: guestError?.message ?? "El cliente no tiene teléfono registrado." };
  }

  const password = normalizePhone(guest.telefono);
  const { error: authError } = await admin.auth.admin.updateUserById(parsed.data.userId, {
    password,
  });

  if (authError) {
    return { ok: false, message: authError.message };
  }

  const { error: updateError } = await admin
    .from("usuarios")
    .update({ must_change_password: true })
    .eq("id", parsed.data.userId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  await writeAuditLog(admin, {
    actor_id: currentUser.authUserId,
    accion: "cliente.password_restablecido",
    entidad: "usuarios",
    entidad_id: parsed.data.userId,
    metadata: { email: guest.email ?? null },
  });

  await emitEvent(admin, {
    event: "cliente.password_restablecido",
    title: "Contraseña restablecida",
    message: "La contraseña del cliente fue restablecida por personal autorizado.",
    userId: parsed.data.userId,
    payload: { user_id: parsed.data.userId },
  });

  revalidatePath("/admin/usuarios");

  return { ok: true, message: "Contraseña restablecida al número de celular del cliente." };
};

