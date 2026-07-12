import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogInsert, Database } from "@/types/database";

export const writeAuditLog = async (
  supabase: SupabaseClient<Database>,
  entry: AuditLogInsert,
) => {
  const { error } = await supabase.from("audit_log").insert({
    usuario_id: entry.actor_id,
    accion: entry.accion,
    tabla_afectada: entry.entidad,
    registro_id: entry.entidad_id ?? null,
    datos_nuevos: entry.metadata ?? null,
  });

  if (error) {
    console.error("audit_log insert failed", error.message);
  }
};
