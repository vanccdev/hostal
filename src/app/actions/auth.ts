"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectByRole } from "@/lib/auth/redirect-by-role";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { authUserExistsByEmailOrPhone } from "@/lib/auth/user-contact";
import { pendingDocumentNumberForUser } from "@/lib/client-profile";
import { normalizePhone } from "@/lib/phone";
import {
  changePasswordSchema,
  completeClientProfileSchema,
  loginSchema,
  signupSchema,
  updateClientProfileSchema,
  type UpdateClientProfileInput,
} from "@/schemas/auth";
import type { ActionState } from "@/app/actions/types";
import {
  duplicatedGuestDocumentState,
  formValue,
  isGuestDocumentUniqueError,
  validationErrors,
} from "@/app/actions/helpers";
import { isStaffRole } from "@/lib/permissions";

const safeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
};

const authErrorMessage = (error: { message?: string } | null | undefined, fallback: string) => {
  const message = error?.message?.trim();
  return message && message !== "{}" ? message : fallback;
};

const validateGuestDocumentAvailableForUser = async <T = unknown>(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  numeroDocumento: string,
  authUserId: string,
): Promise<ActionState<T> | null> => {
  const { data: existingDocument, error } = await admin
    .from("huespedes")
    .select("id")
    .eq("numero_documento", numeroDocumento)
    .neq("usuario_id", authUserId)
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }

  return existingDocument ? duplicatedGuestDocumentState<T>() : null;
};

export const loginAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const parsed = loginSchema.safeParse({
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, message: "Credenciales inválidas." };
  }

  const currentUser = await getCurrentUser();
  const nextPath = safeNextPath(formValue(formData, "next"));
  const profile = currentUser?.profile ?? null;

  if (nextPath && profile?.activo) {
    if (profile.rol === "cliente" && !profile.must_change_password && nextPath.startsWith("/app")) {
      redirect(nextPath);
    }

    if (isStaffRole(profile.rol) && nextPath.startsWith("/admin")) {
      redirect(nextPath);
    }
  }

  return redirectByRole(currentUser?.profile ?? null);
};

export const signupAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const parsed = signupSchema.safeParse({
    nombre: formValue(formData, "nombre"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    telefono: formValue(formData, "telefono"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const telefono = normalizePhone(parsed.data.telefono);
  const admin = createSupabaseAdminClient();
  const existingAuth = await authUserExistsByEmailOrPhone(admin, parsed.data.email, telefono);

  if (existingAuth.error) {
    return { ok: false, message: authErrorMessage(existingAuth.error, "No se pudo validar si la cuenta ya existe.") };
  }

  if (existingAuth.existingEmail) {
    return { ok: false, errors: { email: ["Ya existe una cuenta con ese email."] } };
  }

  if (existingAuth.existingPhone) {
    return { ok: false, errors: { telefono: ["Ya existe una cuenta con ese número de celular o teléfono."] } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        nombre: parsed.data.nombre,
        rol: "cliente",
        telefono,
      },
    },
  });

  if (error || !data.user) {
    return { ok: false, message: authErrorMessage(error, "No se pudo crear la cuenta.") };
  }

  const { error: phoneError } = await admin.auth.admin.updateUserById(data.user.id, {
    phone: telefono,
    phone_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombre,
      rol: "cliente",
      telefono,
    },
  });

  if (phoneError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: authErrorMessage(phoneError, "No se pudo guardar el teléfono de la cuenta.") };
  }

  const { data: existingProfile, error: profileReadError } = await admin
    .from("usuarios")
    .select("id,rol,activo")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileReadError) {
    return { ok: false, message: profileReadError.message };
  }

  if (existingProfile && existingProfile.rol !== "cliente") {
    return { ok: false, message: "Ya existe una cuenta con ese email." };
  }

  const profileQuery = existingProfile
    ? admin.from("usuarios").update({ nombre: parsed.data.nombre }).eq("id", data.user.id)
    : admin.from("usuarios").insert({
        id: data.user.id,
        nombre: parsed.data.nombre,
        rol: "cliente",
        activo: true,
        must_change_password: false,
      });

  const { error: profileError } = await profileQuery;

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: profileError.message };
  }

  const { error: guestError } = await admin.from("huespedes").insert({
    usuario_id: data.user.id,
    tipo_documento: "Otro",
    numero_documento: pendingDocumentNumberForUser(data.user.id),
    pais_origen: null,
    fecha_nacimiento: null,
    observaciones: null,
  });

  if (guestError) {
    await admin.from("usuarios").delete().eq("id", data.user.id);
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: guestError.message };
  }

  const nextPath = safeNextPath(formValue(formData, "next"));
  redirect(nextPath?.startsWith("/app") ? nextPath : "/app");
};

export const completeClientProfileAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const parsed = completeClientProfileSchema.safeParse({
    nombre: formValue(formData, "nombre"),
    telefono: formValue(formData, "telefono"),
    tipoDocumento: formValue(formData, "tipoDocumento"),
    numeroDocumento: formValue(formData, "numeroDocumento"),
    fechaNacimiento: formValue(formData, "fechaNacimiento"),
    pais: formValue(formData, "pais"),
    observaciones: formValue(formData, "observaciones"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "cliente") {
    return { ok: false, message: "Debes iniciar sesión como cliente para completar tu perfil." };
  }

  const admin = createSupabaseAdminClient();
  const normalizedPhone = normalizePhone(parsed.data.telefono);
  const duplicateDocument = await validateGuestDocumentAvailableForUser(
    admin,
    parsed.data.numeroDocumento,
    currentUser.authUserId,
  );

  if (duplicateDocument) {
    return duplicateDocument;
  }

  const { error: profileError } = await admin
    .from("usuarios")
    .update({ nombre: parsed.data.nombre })
    .eq("id", currentUser.authUserId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: authUpdateError } = await admin.auth.admin.updateUserById(currentUser.authUserId, {
    user_metadata: {
      nombre: parsed.data.nombre,
      rol: "cliente",
      telefono: normalizedPhone,
    },
  });

  if (authUpdateError) {
    return { ok: false, message: authUpdateError.message };
  }

  const guestPayload = {
    usuario_id: currentUser.authUserId,
    tipo_documento: parsed.data.tipoDocumento,
    numero_documento: parsed.data.numeroDocumento,
    fecha_nacimiento: parsed.data.fechaNacimiento || null,
    pais_origen: parsed.data.pais || null,
    observaciones: parsed.data.observaciones || null,
  };

  const { data: existingGuest, error: guestReadError } = await admin
    .from("huespedes")
    .select("id")
    .eq("usuario_id", currentUser.authUserId)
    .maybeSingle();

  if (guestReadError) {
    return { ok: false, message: guestReadError.message };
  }

  if (!existingGuest) {
    return { ok: false, message: "No se encontró la ficha de huésped de tu cuenta. Vuelve a iniciar sesión." };
  }

  const guestQuery = admin.from("huespedes").update(guestPayload).eq("id", existingGuest.id);

  const { error: guestError } = await guestQuery;

  if (guestError) {
    if (isGuestDocumentUniqueError(guestError)) {
      return duplicatedGuestDocumentState();
    }

    return { ok: false, message: guestError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/perfil");

  return { ok: true, message: "Perfil completado." };
};

export const updateClientProfileAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState<UpdateClientProfileInput>> => {
  const parsed = updateClientProfileSchema.safeParse({
    nombre: formValue(formData, "nombre"),
    email: formValue(formData, "email"),
    telefono: formValue(formData, "telefono"),
    tipoDocumento: formValue(formData, "tipoDocumento"),
    numeroDocumento: formValue(formData, "numeroDocumento"),
    fechaNacimiento: formValue(formData, "fechaNacimiento"),
    pais: formValue(formData, "pais"),
    observaciones: formValue(formData, "observaciones"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || currentUser.profile.rol !== "cliente") {
    return { ok: false, message: "Debes iniciar sesión como cliente para editar tu perfil." };
  }

  const admin = createSupabaseAdminClient();
  const telefono = normalizePhone(parsed.data.telefono);
  const duplicateDocument = await validateGuestDocumentAvailableForUser<UpdateClientProfileInput>(
    admin,
    parsed.data.numeroDocumento,
    currentUser.authUserId,
  );

  if (duplicateDocument) {
    return duplicateDocument;
  }

  const { error: profileError } = await admin
    .from("usuarios")
    .update({ nombre: parsed.data.nombre })
    .eq("id", currentUser.authUserId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(currentUser.authUserId, {
    email: parsed.data.email,
    phone: telefono,
    phone_confirm: true,
    user_metadata: {
      nombre: parsed.data.nombre,
      rol: "cliente",
      telefono,
    },
  });

  if (authError) {
    return { ok: false, message: authError.message };
  }

  const guestPayload = {
    usuario_id: currentUser.authUserId,
    tipo_documento: parsed.data.tipoDocumento,
    numero_documento: parsed.data.numeroDocumento,
    fecha_nacimiento: parsed.data.fechaNacimiento || null,
    pais_origen: parsed.data.pais || null,
    observaciones: parsed.data.observaciones || null,
  };

  const { data: existingGuest, error: guestReadError } = await admin
    .from("huespedes")
    .select("id")
    .eq("usuario_id", currentUser.authUserId)
    .maybeSingle();

  if (guestReadError) {
    return { ok: false, message: guestReadError.message };
  }

  if (!existingGuest) {
    return { ok: false, message: "No se encontró la ficha de huésped de tu cuenta. Vuelve a iniciar sesión." };
  }

  const guestQuery = admin.from("huespedes").update(guestPayload).eq("id", existingGuest.id);

  const { error: guestError } = await guestQuery;

  if (guestError) {
    if (isGuestDocumentUniqueError(guestError)) {
      return duplicatedGuestDocumentState();
    }

    return { ok: false, message: guestError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/perfil");

  return {
    ok: true,
    message: "Perfil actualizado.",
    data: {
      nombre: parsed.data.nombre,
      email: parsed.data.email,
      telefono,
      tipoDocumento: parsed.data.tipoDocumento,
      numeroDocumento: parsed.data.numeroDocumento,
      fechaNacimiento: parsed.data.fechaNacimiento ?? "",
      pais: parsed.data.pais ?? "",
      observaciones: parsed.data.observaciones ?? "",
    },
  };
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
};

export const changePasswordAction = async (
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const parsed = changePasswordSchema.safeParse({
    password: formValue(formData, "password"),
  });

  if (!parsed.success) {
    return { ok: false, errors: validationErrors(parsed.error) };
  }

  const currentUser = await getCurrentUser();

  if (!currentUser?.profile) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const admin = createSupabaseAdminClient();
  const { error: profileError } = await admin
    .from("usuarios")
    .update({ must_change_password: false })
    .eq("id", currentUser.authUserId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  revalidatePath("/app");
  redirect("/app");
};
