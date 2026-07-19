"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { isManagementRole } from "@/lib/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const safeAdminPath = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.startsWith("/admin/") && !value.startsWith("//") ? value : "/admin/notificaciones";

export const markNotificationReadAction = async (formData: FormData) => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return;
  }

  const notificationId = formData.get("notificationId");

  if (typeof notificationId !== "string" || !notificationId) {
    return;
  }

  const admin = createSupabaseAdminClient();
  await admin.from("notificaciones").update({ leida: true }).eq("id", notificationId);
  revalidatePath("/admin/notificaciones");
};

export const openNotificationDetailAction = async (formData: FormData) => {
  const currentUser = await getCurrentUser();
  const href = safeAdminPath(formData.get("href"));

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    redirect(href);
  }

  const notificationId = formData.get("notificationId");

  if (typeof notificationId === "string" && notificationId) {
    const admin = createSupabaseAdminClient();
    await admin.from("notificaciones").update({ leida: true }).eq("id", notificationId);
    revalidatePath("/admin/notificaciones");
  }

  redirect(href);
};

export const markAllNotificationsReadAction = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser?.profile || !isManagementRole(currentUser.profile.rol)) {
    return;
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("notificaciones").update({ leida: true }).eq("leida", false);

  if (error) {
    return;
  }

  revalidatePath("/admin/notificaciones");
};
