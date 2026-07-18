import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const getGuestForUser = async (userId: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("huespedes")
    .select("id,usuario_id,tipo_documento,numero_documento,pais_origen,fecha_nacimiento,observaciones,created_at,updated_at")
    .eq("usuario_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};
