import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import type { CurrentUser } from "@/lib/auth/get-current-user";
import type { UserRole } from "@/types/database";

export const requireAuth = async (): Promise<CurrentUser> => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (!currentUser.profile) {
    redirect("/login?error=perfil-no-encontrado");
  }

  if (!currentUser.profile.activo) {
    redirect("/cuenta-desactivada");
  }

  return currentUser;
};

export const requireRole = async (roles: UserRole[]): Promise<CurrentUser> => {
  const currentUser = await requireAuth();

  if (!roles.includes(currentUser.profile!.rol)) {
    redirect("/403");
  }

  return currentUser;
};

export const requirePasswordReady = async () => {
  const currentUser = await requireAuth();

  if (currentUser.profile?.rol === "cliente" && currentUser.profile.must_change_password) {
    redirect("/app/cambiar-contrasena");
  }

  return currentUser;
};

