"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/db/audit";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { authUserPhone } from "@/lib/auth/user-contact";
import { isManagementRole } from "@/lib/permissions";
import { normalizePhone } from "@/lib/phone";
import { emitEvent } from "@/lib/notifications/emit-event";
import { clienteStaffSchema } from "@/schemas/clientes";
import type { ClienteStaffInput } from "@/schemas/clientes";
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

const dbErrorMessage = (error: { code?: string; message?: string; details?: string } | null | undefined) => {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;

  if (error?.code === "23505" && text.includes("usuarios_pkey")) {
    return "No se pudo completar el registro. No se guardó ningún cliente; puedes corregir los datos e intentarlo otra vez.";
  }

  return error?.message ?? "No se pudo completar la operación.";
};

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const cleanupClientCreation = async (admin: AdminClient, userId: string) => {
  const { error: guestDeleteError } = await admin.from("huespedes").delete().eq("usuario_id", userId);
  const { error: profileDeleteError } = await admin.from("usuarios").delete().eq("id", userId);
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);

  return guestDeleteError ?? profileDeleteError ?? authDeleteError ?? null;
};

const rollbackMessage = (error: { message?: string } | null) =>
  error
    ? "No se pudo completar el registro y tampoco se pudo revertir completamente. Revisa Usuarios/Auth antes de volver a intentarlo."
    : "No se pudo completar el registro. No se guardó ningún cliente; puedes corregir los datos e intentarlo otra vez.";

const hasLocalClientRecords = async (admin: AdminClient, userId: string) => {
  const [{ data: profile, error: profileError }, { data: guest, error: guestError }] = await Promise.all([
    admin.from("usuarios").select("id").eq("id", userId).maybeSingle(),
    admin.from("huespedes").select("id").eq("usuario_id", userId).maybeSingle(),
  ]);

  return {
    hasRecords: Boolean(profile || guest),
    error: profileError ?? guestError ?? null,
  };
};

const validateExistingAuthUser = async (
  admin: AdminClient,
  userId: string,
  field: "email" | "telefono",
  values: ClienteStaffInput,
): Promise<ActionState<CreateClientStaffData> | null> => {
  const localRecords = await hasLocalClientRecords(admin, userId);

  if (localRecords.error) {
    return { ok: false, message: dbErrorMessage(localRecords.error), data: { values } };
  }

  if (!localRecords.hasRecords) {
    const rollbackError = await cleanupClientCreation(admin, userId);

    return rollbackError ? { ok: false, message: rollbackMessage(rollbackError), data: { values } } : null;
  }

  return field === "email"
    ? { ok: false, errors: { email: ["Ya existe una cuenta con ese email."] }, data: { values } }
    : {
        ok: false,
        errors: { telefono: ["Ya existe una cuenta con ese número de celular o teléfono."] },
        data: { values },
      };
};

type CreateClientStaffData = {
  guestId?: string;
  userId?: string;
  initialPassword?: string;
  values?: ClienteStaffInput;
};

export const createClientAccountByStaff = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<CreateClientStaffData>> => {
  const currentUser = await getCurrentUser();
  const submittedValues = {
    nombreCompleto: formValue(formData, "nombreCompleto"),
    email: formValue(formData, "email"),
    telefono: formValue(formData, "telefono"),
    tipoDocumento: formValue(formData, "tipoDocumento"),
    numeroDocumento: formValue(formData, "numeroDocumento"),
    pais: formValue(formData, "pais"),
  };

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return { ok: false, message: "No tienes permiso para crear clientes.", data: { values: submittedValues as ClienteStaffInput } };
  }

  const parsed = clienteStaffSchema.safeParse(submittedValues);

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error), data: { values: submittedValues as ClienteStaffInput } };
  }

  const admin = createSupabaseAdminClient();
  const phone = normalizePhone(parsed.data.telefono);
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const { data: authUsers, error: authListError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (authListError) {
    return {
      ok: false,
      message: authErrorMessage(authListError, "No se pudo validar si la cuenta ya existe."),
      data: { values: parsed.data },
    };
  }

  const existingEmailUser = (authUsers.users ?? []).find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
  const existingPhoneUser = (authUsers.users ?? []).find((user) => authUserPhone(user)?.trim() === phone);

  if (existingEmailUser) {
    const existingEmailState = await validateExistingAuthUser(admin, existingEmailUser.id, "email", parsed.data);

    if (existingEmailState) {
      return existingEmailState;
    }
  }

  if (existingPhoneUser && existingPhoneUser.id !== existingEmailUser?.id) {
    const existingPhoneState = await validateExistingAuthUser(admin, existingPhoneUser.id, "telefono", parsed.data);

    if (existingPhoneState) {
      return existingPhoneState;
    }
  }

  const { data: existingGuests, error: duplicateError } = await admin
    .from("huespedes")
    .select("id")
    .eq("numero_documento", parsed.data.numeroDocumento)
    .limit(1);

  if (duplicateError) {
    return { ok: false, message: duplicateError.message, data: { values: parsed.data } };
  }

  if (existingGuests.length > 0) {
    return { ...duplicatedGuestDocumentState<CreateClientStaffData>(), data: { values: parsed.data } };
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
    return {
      ok: false,
      message: authErrorMessage(authError, "No se pudo crear el usuario Auth."),
      data: { values: parsed.data },
    };
  }

  const { error: profileError } = await admin
    .from("usuarios")
    .upsert(
      {
        id: created.user.id,
        nombre: parsed.data.nombreCompleto,
        rol: "cliente",
        activo: true,
        must_change_password: true,
      },
      { onConflict: "id" },
    );

  if (profileError) {
    const rollbackError = await cleanupClientCreation(admin, created.user.id);

    return { ok: false, message: rollbackError ? rollbackMessage(rollbackError) : dbErrorMessage(profileError), data: { values: parsed.data } };
  }

  const { data: guest, error: guestError } = await admin
    .from("huespedes")
    .insert({
      usuario_id: created.user.id,
      tipo_documento: parsed.data.tipoDocumento,
      numero_documento: parsed.data.numeroDocumento,
      pais_origen: parsed.data.pais || null,
    })
    .select("id")
    .single();

  if (guestError || !guest) {
    const rollbackError = await cleanupClientCreation(admin, created.user.id);

    if (rollbackError) {
      return { ok: false, message: rollbackMessage(rollbackError), data: { values: parsed.data } };
    }

    if (isGuestDocumentUniqueError(guestError)) {
      return { ...duplicatedGuestDocumentState<CreateClientStaffData>(), data: { values: parsed.data } };
    }

    return { ok: false, message: dbErrorMessage(guestError), data: { values: parsed.data } };
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
    actorId: currentUser.authUserId,
    entity: "usuarios",
    entityId: created.user.id,
    payload: { user_id: created.user.id, email: parsed.data.email },
  });

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Cuenta creada. Contraseña inicial: número de celular del cliente.",
    data: {
      guestId: guest.id,
      userId: created.user.id,
      initialPassword: phone,
    },
  };
};
