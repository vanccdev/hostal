"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectByRole } from "@/lib/auth/redirect-by-role";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { pendingDocumentNumberForUser } from "@/lib/client-profile";
import { normalizePhone } from "@/lib/phone";
import { changePasswordSchema, completeClientProfileSchema, loginSchema, signupSchema } from "@/schemas/auth";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";
import { isStaffRole } from "@/lib/permissions";

const safeNextPath = (value: string | null) => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
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

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        nombre: parsed.data.nombre,
        rol: "cliente",
      },
    },
  });

  if (error || !data.user) {
    return { ok: false, message: error?.message ?? "No se pudo crear la cuenta." };
  }

  const admin = createSupabaseAdminClient();
  const telefono = normalizePhone(parsed.data.telefono);

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
    return { ok: false, message: profileError.message };
  }

  const guestPayload = {
    usuario_id: data.user.id,
    nombre_completo: parsed.data.nombre,
    email: parsed.data.email,
    telefono,
    tipo_documento: "Otro" as const,
    numero_documento: pendingDocumentNumberForUser(data.user.id),
    pais_origen: null,
  };

  const { data: existingGuest, error: guestReadError } = await admin
    .from("huespedes")
    .select("id")
    .eq("usuario_id", data.user.id)
    .maybeSingle();

  if (guestReadError) {
    return { ok: false, message: guestReadError.message };
  }

  const guestQuery = existingGuest
    ? admin.from("huespedes").update(guestPayload).eq("id", existingGuest.id)
    : admin.from("huespedes").insert(guestPayload);

  const { error: guestError } = await guestQuery;

  if (guestError) {
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
    pais: formValue(formData, "pais"),
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

  const { error: profileError } = await admin
    .from("usuarios")
    .update({ nombre: parsed.data.nombre })
    .eq("id", currentUser.authUserId);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const guestPayload = {
    usuario_id: currentUser.authUserId,
    nombre_completo: parsed.data.nombre,
    email: currentUser.email,
    telefono: normalizedPhone,
    tipo_documento: parsed.data.tipoDocumento,
    numero_documento: parsed.data.numeroDocumento,
    pais_origen: parsed.data.pais || null,
  };

  const { data: existingGuest, error: guestReadError } = await admin
    .from("huespedes")
    .select("id")
    .eq("usuario_id", currentUser.authUserId)
    .maybeSingle();

  if (guestReadError) {
    return { ok: false, message: guestReadError.message };
  }

  const guestQuery = existingGuest
    ? admin.from("huespedes").update(guestPayload).eq("id", existingGuest.id)
    : admin.from("huespedes").insert(guestPayload);

  const { error: guestError } = await guestQuery;

  if (guestError) {
    return { ok: false, message: guestError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/perfil");

  return { ok: true, message: "Perfil completado." };
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
