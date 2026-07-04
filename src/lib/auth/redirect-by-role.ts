import { redirect } from "next/navigation";
import type { Usuario } from "@/types/database";
import { isStaffRole } from "@/lib/permissions";

export const getPathByRole = (profile: Usuario | null) => {
  if (!profile) {
    return "/login?error=perfil-no-encontrado";
  }

  if (!profile.activo) {
    return "/cuenta-desactivada";
  }

  if (profile.rol === "cliente") {
    return profile.must_change_password ? "/app/cambiar-contrasena" : "/app";
  }

  if (isStaffRole(profile.rol)) {
    return "/admin";
  }

  return "/login";
};

export const redirectByRole = (profile: Usuario | null): never => {
  redirect(getPathByRole(profile));
};

