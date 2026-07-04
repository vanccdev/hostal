import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { canAccessAdminModule, type AdminModule } from "@/lib/permissions";

export const requireAdminModule = async (module: AdminModule) => {
  const currentUser = await requireRole(["admin", "recepcionista", "limpieza"]);

  if (!canAccessAdminModule(currentUser.profile!.rol, module)) {
    redirect("/403");
  }

  return currentUser;
};

