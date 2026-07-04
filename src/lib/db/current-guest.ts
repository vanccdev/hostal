import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const getGuestForUser = async (userId: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("huespedes")
    .select("id,usuario_id,nombre_completo,email,telefono,tipo_documento,numero_documento,pais")
    .eq("usuario_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

