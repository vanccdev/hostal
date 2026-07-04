"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirectByRole } from "@/lib/auth/redirect-by-role";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { normalizePhone } from "@/lib/phone";
import { changePasswordSchema, loginSchema, signupSchema } from "@/schemas/auth";
import type { ActionState } from "@/app/actions/types";
import { formValue, validationErrors } from "@/app/actions/helpers";

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
  return redirectByRole(currentUser?.profile ?? null);
};

export const signupAction = async (_state: ActionState, formData: FormData): Promise<ActionState> => {
  const parsed = signupSchema.safeParse({
    nombre: formValue(formData, "nombre"),
    email: formValue(formData, "email"),
    password: formValue(formData, "password"),
    telefono: formValue(formData, "telefono"),
    documento: formValue(formData, "documento"),
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
  const telefono = parsed.data.telefono ? normalizePhone(parsed.data.telefono) : null;

  const { error: profileError } = await admin.from("usuarios").insert({
    id: data.user.id,
    nombre: parsed.data.nombre,
    rol: "cliente",
    activo: true,
    must_change_password: false,
  });

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  const { error: guestError } = await admin.from("huespedes").insert({
    usuario_id: data.user.id,
    nombre_completo: parsed.data.nombre,
    email: parsed.data.email,
    telefono,
    numero_documento: parsed.data.documento || null,
  });

  if (guestError) {
    return { ok: false, message: guestError.message };
  }

  redirect("/app");
};

export const logoutAction = async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
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
