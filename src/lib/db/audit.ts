import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogInsert, Database } from "@/types/database";

export const writeAuditLog = async (
  supabase: SupabaseClient<Database>,
  entry: AuditLogInsert,
) => {
  const { error } = await supabase.from("audit_log").insert(entry);

  if (error) {
    console.error("audit_log insert failed", error.message);
  }
};

