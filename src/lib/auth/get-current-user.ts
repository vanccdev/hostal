import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Usuario } from "@/types/database";

export type CurrentUser = {
  authUserId: string;
  email: string | null;
  profile: Usuario | null;
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("usuarios")
    .select("id,nombre,rol,activo,created_at,must_change_password")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authUserId: user.id,
    email: user.email ?? null,
    profile,
  };
};

